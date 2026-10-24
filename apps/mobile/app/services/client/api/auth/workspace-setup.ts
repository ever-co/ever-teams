import { jwtDecode } from 'jwt-decode';
import { refreshTokenRequest } from '../../requests/auth';
import { createEmployeeFromUser } from '../../requests/employee';
import { createSmtpTenantRequest } from '../../requests/features/smtp';
import { createOrganizationRequest } from '../../requests/organization';
import { createOrganizationTeamRequest } from '../../requests/organization-team';
import { createTenantRequest } from '../../requests/tenant';
import { load, remove, save } from '../../../../utils/storage';

/**
 * A sign-up whose workspace is not set up yet, kept on the device for the user it registered: the team name asked for
 * at register (Gauzy keeps the account inactive until its e-mail is confirmed, so the workspace is set up at the first
 * sign-in after), and the mark that a setup started, so one that stopped half-way resumes at the next sign-in. Keyed
 * by user, not e-mail: one e-mail can sign in to several workspaces (one user each), and another workspace of that
 * e-mail must never be taken for this one's unfinished setup.
 */
const pendingSignupKey = (userId: string) => `ever-teams-pending-signup:${userId}`;

/** @returns false when the device could not store it (the setup then uses the default team name). */
export async function savePendingSignup(userId: string, team: string | null): Promise<boolean> {
	return save(pendingSignupKey(userId), { team: team?.trim() || null });
}

export async function loadPendingSignup(userId: string): Promise<{ team: string | null } | null> {
	const pending = await load(pendingSignupKey(userId));
	return pending && typeof pending === 'object' ? { team: typeof pending.team === 'string' ? pending.team : null } : null;
}

export async function clearPendingSignup(userId: string): Promise<void> {
	await remove(pendingSignupKey(userId));
}

/**
 * The user organization `token` acts in, else the first one. Gauzy confines a non-admin to the token's organization
 * (organization boundary, ever-co/ever-gauzy#11316), so the app must act in that one; the first of the list can be
 * another.
 */
export function pickTokenOrganization<T extends { organizationId?: string | null }>(
	items: T[] | undefined,
	token: string
): T | undefined {
	let tokenOrganizationId: string | null | undefined;
	try {
		tokenOrganizationId = jwtDecode<{ organizationId?: string | null }>(token)?.organizationId;
	} catch {
		tokenOrganizationId = undefined;
	}
	return items?.find((item) => item.organizationId === tokenOrganizationId) ?? items?.[0];
}

/** The request helpers answer an HTTP error instead of throwing: this one throws, with the step that failed. */
function required<T extends { id?: string }>(step: string, result: { data: T; response: Response }): T {
	if (!result.response.ok || !result.data?.id) {
		throw new Error(`Workspace setup failed at ${step} (HTTP ${result.response.status})`);
	}
	return result.data;
}

/**
 * Sets up the workspace (tenant, SMTP, organization, employee, team) of a confirmed sign-up that has none. Gauzy keeps
 * a self-registration inactive until its e-mail link is opened (ever-co/ever-gauzy#11341), so the register flow can no
 * longer do this at once: the first sign-in after the confirmation does, with the same steps. What an earlier attempt
 * that stopped half-way left (`existingTenantId`, `existingOrganizationId`, `existingEmployeeId`, owned by this account)
 * is kept and the remaining steps run. The workspace takes the `team` name asked for at register, else the person's.
 *
 * @returns the tenant and organization ids and the refreshed tokens, or null when a step failed.
 */
export async function setupConfirmedSignupWorkspace(input: {
	accessToken: string;
	refreshToken: string;
	userId: string;
	name?: string;
	team?: string | null;
	existingTenantId?: string;
	existingOrganizationId?: string;
	existingEmployeeId?: string;
}): Promise<{ tenantId: string; organizationId: string; accessToken: string; refreshToken: string } | null> {
	try {
		const team = input.team?.trim() || (input.name?.trim() ? `${input.name.trim()}'s Team` : 'My Team');

		let tenantId = input.existingTenantId;
		if (!tenantId) {
			tenantId = required('tenant', await createTenantRequest(team, input.accessToken)).id as string;
			// The SMTP settings are a convenience: a failure there does not stop the setup
			await createSmtpTenantRequest(input.accessToken, tenantId).catch(() => undefined);
		}

		const organizationId =
			input.existingOrganizationId ||
			(required(
				'organization',
				await createOrganizationRequest(
					{ currency: 'USD', name: team, tenantId, invitesAllowed: true },
					input.accessToken
				)
			).id as string);
		const employeeId =
			input.existingEmployeeId ||
			(required(
				'employee',
				await createEmployeeFromUser(
					{
						organizationId,
						startedWorkOn: new Date().toISOString(),
						tenantId,
						userId: input.userId
					},
					input.accessToken
				)
			).id as string);
		required(
			'team',
			await createOrganizationTeamRequest(
				{ name: team, tenantId, organizationId, managerIds: [employeeId] },
				input.accessToken
			)
		);

		// A token minted before the tenant existed names none: refresh it, and keep the rotated refresh token
		const refreshed = await refreshTokenRequest(input.refreshToken);
		if (!refreshed.response.ok || !refreshed.data?.token) {
			throw new Error(`Workspace setup failed at token refresh (HTTP ${refreshed.response.status})`);
		}
		return {
			tenantId,
			organizationId,
			accessToken: refreshed.data.token,
			refreshToken: refreshed.data.refresh_token || input.refreshToken
		};
	} catch (error) {
		console.log(error);
		return null;
	}
}
