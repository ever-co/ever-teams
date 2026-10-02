import type { NextResponse } from 'next/server';
import { SMTP_PASSWORD, SMTP_USERNAME } from '@/core/constants/config/constants';
import { setAuthCookies } from '@/core/lib/helpers/cookies';
import {
	createEmployeeFromUser,
	createOrganizationRequest,
	createOrganizationTeamRequest,
	createTenantRequest,
	createTenantSmtpRequest,
	refreshTokenRequest
} from '@/core/services/server/requests';
import { everIdWorkspaceSigninRequest } from '@/core/services/server/requests/ever-id';

/**
 * The workspace setup of an account the Gauzy API created for an Ever ID (it has no tenant yet), with the same
 * steps as the register route: Gauzy's unchanged workspace sign-in with the account's workspace token, then the
 * tenant (and its SMTP settings when configured), the organization, the employee, the team and the session cookies.
 *
 * Used right after an Ever ID sign-up, and to resume a setup that did not finish (it failed, or the sign-up was
 * completed by the API after checkout) at a later Ever ID sign-in.
 */

const SMTP_CONFIGURED = Boolean(SMTP_USERNAME && SMTP_PASSWORD);

/**
 * `ok`: set up and signed in (the cookies are on `response`); `token_expired`: the workspace token is too old
 * (Ever ID workspace tokens last 15 minutes): sign in with Ever ID again; `has_workspace`: the account already has
 * its tenant (nothing to set up); `failed`: the API failed somewhere.
 */
type EverIdProvisionResult = 'ok' | 'token_expired' | 'has_workspace' | 'failed';

interface EverIdProvisionInput {
	req: Request;
	response: NextResponse;
	email: string;
	workspaceToken: string;
	/** The user id of the workspace entry, when the workspace sign-in answer has none. */
	fallbackUserId?: string;
	/** The team (and tenant, organization) name; by default "<name>'s Team". */
	team?: string;
	timezone?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Gauzy's answer to an expired workspace token: 400 "JWT token has been expired." */
function isExpiredWorkspaceTokenAnswer(status: number, data: unknown): boolean {
	return status === 400 && isRecord(data) && typeof data.message === 'string' && /expired/i.test(data.message);
}

/** The default name of a first team, as the sign-up form proposes it. */
function defaultTeamName(user: Record<string, unknown> | undefined): string {
	const named = typeof user?.name === 'string' ? user.name.trim() : '';
	const parts = [user?.firstName, user?.lastName].filter((part): part is string => typeof part === 'string');
	const name = named || parts.join(' ').trim();
	return name ? `${name}'s Team` : 'My Team';
}

export async function provisionEverIdWorkspace(input: EverIdProvisionInput): Promise<EverIdProvisionResult> {
	let signin;
	try {
		signin = await everIdWorkspaceSigninRequest(input.email, input.workspaceToken);
	} catch {
		return 'failed';
	}
	if (isExpiredWorkspaceTokenAnswer(signin.status, signin.data)) return 'token_expired';
	if (signin.status !== 200 || !signin.data?.token || !signin.data.refresh_token) return 'failed';
	const user = signin.data.user as unknown as Record<string, unknown> | undefined;
	if (typeof user?.tenantId === 'string' && user.tenantId) return 'has_workspace';

	try {
		let auth_token = signin.data.token;
		const userId = signin.data.user?.id ?? input.fallbackUserId ?? '';
		const team = input.team || defaultTeamName(user);

		const { data: tenant } = await createTenantRequest(team, auth_token);

		if (SMTP_CONFIGURED) {
			await createTenantSmtpRequest({ access_token: auth_token, tenantId: tenant.id });
		}

		const { data: organization } = await createOrganizationRequest(
			{ currency: 'USD', name: team, tenantId: tenant.id, invitesAllowed: true },
			auth_token
		);

		const { data: employee } = await createEmployeeFromUser(
			{ organizationId: organization.id, startedWorkOn: new Date(), tenantId: tenant.id, userId },
			auth_token
		);

		const { data: createdTeam } = await createOrganizationTeamRequest(
			{
				name: team,
				tenantId: tenant.id,
				organizationId: organization.id,
				managerIds: [employee.id],
				public: true
			},
			auth_token
		);

		const { data: refreshed } = await refreshTokenRequest(signin.data.refresh_token);
		auth_token = refreshed.token;

		setAuthCookies(
			{
				access_token: auth_token,
				refresh_token: { token: refreshed.refresh_token || signin.data.refresh_token },
				timezone: input.timezone,
				teamId: createdTeam.id,
				tenantId: tenant.id,
				organizationId: organization.id,
				languageId: 'en',
				userId
			},
			{ req: input.req, res: input.response }
		);
		return 'ok';
	} catch {
		return 'failed';
	}
}
