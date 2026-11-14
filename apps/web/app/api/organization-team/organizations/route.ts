import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getAllOrganizationTeamRequest, getUserOrganizationsRequest } from '@/core/services/server/requests';
import { readTeamMenuOrganizations } from '@/core/lib/utils/team-menu-organizations';
import { isTenantAdminRole } from '@/core/lib/utils/roles';

/**
 * Proxy mode twin of the team menu's read (ever-co/ever-teams#5204): the person's organizations of the workspace, the
 * current one apart, and the other organizations' teams for a workspace admin, whom Gauzy lets read them; anyone else
 * is offered each other organization as one to switch to. Every read goes to Gauzy with the caller's session, so
 * Gauzy's own membership and permission checks apply as in direct mode.
 */
export async function GET(req: Request) {
	const res = new NextResponse();
	const { user, access_token, tenantId, organizationId, status } = await authenticatedGuard(req, res);

	if (!user) {
		return NextResponse.json({}, { status: status ?? 401 });
	}

	const token = access_token || '';
	const tenant = tenantId || '';

	try {
		const { data: memberships } = await getUserOrganizationsRequest({ tenantId: tenant, userId: user.id }, token);
		const organizations = await readTeamMenuOrganizations({
			memberships: memberships?.items ?? [],
			currentOrganizationId: organizationId,
			listsTeams: isTenantAdminRole(user.role?.name),
			readTeams: async (otherOrganizationId) => {
				const { data } = await getAllOrganizationTeamRequest(
					{ tenantId: tenant, organizationId: otherOrganizationId },
					token
				);
				return data?.items ?? [];
			}
		});
		return NextResponse.json(organizations);
	} catch {
		return NextResponse.json({ error: 'Failed to read the organizations' }, { status: 502 });
	}
}
