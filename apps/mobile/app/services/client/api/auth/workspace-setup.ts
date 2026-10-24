import { jwtDecode } from 'jwt-decode';
import { refreshTokenRequest } from '../../requests/auth';
import { createEmployeeFromUser } from '../../requests/employee';
import { createSmtpTenantRequest } from '../../requests/features/smtp';
import { createOrganizationRequest } from '../../requests/organization';
import { createOrganizationTeamRequest } from '../../requests/organization-team';
import { createTenantRequest } from '../../requests/tenant';

/**
 * The user organization `token` acts in, else the first one. Gauzy confines a non-admin to the token's organization
 * (organization boundary, ever-co/ever-gauzy#11316), so the app must act in that one; the first of the list can be
 * another.
 */
export function pickTokenOrganization<T extends { organizationId?: string }>(
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

/**
 * Sets up the workspace (tenant, SMTP, organization, employee, team) of a confirmed sign-up that has none. Gauzy keeps
 * a self-registration inactive until its e-mail link is opened (ever-co/ever-gauzy#11341), so the register flow can no
 * longer do this at once: the first sign-in after the confirmation does, with the same steps.
 *
 * @returns the new tenant and organization ids and a refreshed access token, or null when a step failed.
 */
export async function setupConfirmedSignupWorkspace(input: {
	accessToken: string;
	refreshToken: string;
	userId: string;
	name?: string;
}): Promise<{ tenantId: string; organizationId: string; accessToken: string } | null> {
	try {
		const team = input.name?.trim() ? `${input.name.trim()}'s Team` : 'My Team';
		const { data: tenant } = await createTenantRequest(team, input.accessToken);
		await createSmtpTenantRequest(input.accessToken, tenant.id);
		const { data: organization } = await createOrganizationRequest(
			{ currency: 'USD', name: team, tenantId: tenant.id, invitesAllowed: true },
			input.accessToken
		);
		const { data: employee } = await createEmployeeFromUser(
			{
				organizationId: organization.id,
				startedWorkOn: new Date().toISOString(),
				tenantId: tenant.id,
				userId: input.userId
			},
			input.accessToken
		);
		await createOrganizationTeamRequest(
			{ name: team, tenantId: tenant.id, organizationId: organization.id, managerIds: [employee.id] },
			input.accessToken
		);
		const { data: refreshed } = await refreshTokenRequest(input.refreshToken);
		return { tenantId: tenant.id, organizationId: organization.id, accessToken: refreshed.token };
	} catch {
		return null;
	}
}
