import { NextResponse } from 'next/server';
import { SMTP_PASSWORD, SMTP_USERNAME } from '@/core/constants/config/constants';
import { setAuthCookies } from '@/core/lib/helpers/cookies';
import { isEverIdConfigured } from '@/core/lib/auth/ever-id/config';
import { readEverIdHandoff } from '@/core/lib/auth/ever-id/handoff';
import { logEverIdOutcome, type EverIdStepOutcome } from '@/core/lib/auth/ever-id/log';
import {
	createEmployeeFromUser,
	createOrganizationRequest,
	createOrganizationTeamRequest,
	createTenantRequest,
	createTenantSmtpRequest,
	refreshTokenRequest
} from '@/core/services/server/requests';
import { everIdSignupRequest, everIdWorkspaceSigninRequest } from '@/core/services/server/requests/ever-id';
import type { IEverIdTermsClaim, IEverIdWorkspacesResponse } from '@/core/types/interfaces/auth/ever-id';

/**
 * The Ever ID branch of POST /api/auth/register: a person new to the product creates their workspace with
 * the Ever ID they just signed in with.
 *
 * It runs only for a body that carries `ever_id_handoff` (without it the register route is unchanged), and
 * only once the person ticked the confirmation (`confirm: true`): nothing is created before that. The
 * account is created by the Gauzy API from the verified Ever ID (`POST /api/auth/zitadel/signup`, behind its
 * own subscription check), which also links the Ever ID to it; then the register route's usual steps run
 * (tenant, SMTP, organization, employee, team) and the person is signed in.
 */

const SMTP_CONFIGURED = Boolean(SMTP_USERNAME && SMTP_PASSWORD);

/** What each failed answer of the API's sign-up becomes (anything unlisted is the API's failure, 502). */
const SIGNUP_FAILURES: Record<number, { status: number; outcome: EverIdStepOutcome; errors: Record<string, string> }> =
	{
		400: {
			status: 400,
			outcome: 'invalid',
			errors: { confirm: 'Accept the required documents to create your workspace.' }
		},
		410: {
			status: 410,
			outcome: 'expired',
			errors: { email: 'This sign-up link has expired. Sign in with Ever ID again.' }
		},
		429: { status: 429, outcome: 'throttled', errors: { email: 'Too many attempts. Try again in a minute.' } },
		502: {
			status: 502,
			outcome: 'gauzy_error',
			errors: { email: 'The workspace could not be created. Try again later.' }
		}
	};

/** Whether a register body is an Ever ID sign-up (it carries the hand-off key). */
export function isEverIdRegisterBody(body: unknown): boolean {
	return !!body && typeof body === 'object' && 'ever_id_handoff' in body;
}

function errors(status: number, fields: Record<string, string>, extra: Record<string, unknown> = {}): NextResponse {
	return NextResponse.json({ errors: fields, ...extra }, { status });
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** The accepted documents as the API expects them; anything malformed is dropped. */
function termsClaims(value: unknown): IEverIdTermsClaim[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((claim): claim is Record<string, unknown> => !!claim && typeof claim === 'object')
		.map((claim) => ({
			documentId: text(claim.documentId),
			version: text(claim.version),
			sha256: text(claim.sha256),
			locale: text(claim.locale)
		}))
		.filter((claim) => claim.documentId && claim.version && /^[0-9a-f]{64}$/.test(claim.sha256) && claim.locale)
		.slice(0, 10);
}

function isHttpsUrl(value: unknown): value is string {
	try {
		return typeof value === 'string' && new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

function isWorkspacesResponse(value: unknown): value is IEverIdWorkspacesResponse {
	const response = value as IEverIdWorkspacesResponse;
	return (
		!!response &&
		Array.isArray(response.workspaces) &&
		response.workspaces.length > 0 &&
		typeof response.workspaces[0]?.token === 'string' &&
		typeof response.workspaces[0]?.user?.id === 'string'
	);
}

export async function registerWithEverId(req: Request, input: unknown, response: NextResponse): Promise<NextResponse> {
	const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
	if (!isEverIdConfigured()) {
		return errors(404, { email: 'Ever ID sign-up is not available.' });
	}
	const handoff = readEverIdHandoff(typeof body.ever_id_handoff === 'string' ? body.ever_id_handoff : null);
	if (!handoff) {
		return errors(400, { email: 'This sign-up link is not valid. Sign in with Ever ID again.' });
	}
	if (body.confirm !== true) {
		return errors(400, { confirm: 'Confirm that you want to create your workspace with this Ever ID.' });
	}

	const team = text(body.team);
	const names = text(body.name).split(' ');
	const startedAt = Date.now();
	const log = (outcome: EverIdStepOutcome, status?: number) =>
		logEverIdOutcome('ever_id.signup', { outcome, latencyMs: Date.now() - startedAt, status });

	let signup;
	try {
		signup = await everIdSignupRequest({
			handoff,
			firstName: names[0] || undefined,
			lastName: names.slice(1).join(' ') || undefined,
			terms: termsClaims(body.terms)
		});
	} catch {
		log('gauzy_error', 0);
		return errors(502, { email: 'The workspace could not be created. Try again later.' });
	}

	const signupData = signup.data as Record<string, unknown> | undefined;
	if (signup.status === 403 && signupData?.code === 'subscription_required' && isHttpsUrl(signupData.checkoutUrl)) {
		// The confirmed sign-up waits in the API while the person goes through checkout; it completes at their
		// next Ever ID sign-in.
		log('subscription_required', signup.status);
		return NextResponse.json({ checkoutUrl: signupData.checkoutUrl }, { status: 403 });
	}
	if (signup.status !== 200 || !isWorkspacesResponse(signup.data)) {
		const failure = SIGNUP_FAILURES[signup.status] ?? SIGNUP_FAILURES[502];
		log(failure.outcome, signup.status);
		return errors(failure.status, failure.errors);
	}

	const created = signup.data;
	const workspace = created.workspaces[0];
	try {
		// Gauzy's unchanged workspace sign-in for the new account (it has no tenant yet).
		const signin = await everIdWorkspaceSigninRequest(
			created.confirmed_email || workspace.user.email || '',
			workspace.token
		);
		if (signin.status !== 200 || !signin.data?.token || !signin.data.refresh_token) {
			throw new Error(`workspace sign-in answered ${signin.status}`);
		}
		let auth_token = signin.data.token;
		const userId = signin.data.user?.id ?? workspace.user.id;

		// From here on, the same steps as the register route.
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
				timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
				teamId: createdTeam.id,
				tenantId: tenant.id,
				organizationId: organization.id,
				languageId: 'en',
				userId
			},
			{ req, res: response }
		);
	} catch {
		// The account exists and is linked: signing in with Ever ID again reaches it.
		log('gauzy_error');
		return errors(502, {
			team: 'Your account was created, but the workspace could not be set up. Sign in with Ever ID again.'
		});
	}

	log('ok', signup.status);
	return response;
}
