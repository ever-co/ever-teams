'use client';

import { useAtomValue } from 'jotai';
import { activeTeamManagersState, activeTeamState } from '@/core/stores';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { useUserQuery } from '../queries/user-user.query';
import { useMyRolePermissionsQuery } from '../roles/use-my-role-permissions-query';

/** Any one of these lets the API accept invitations into every team of the organization. */
const ORGANIZATION_WIDE_PERMISSIONS = ['ALL_ORG_VIEW', 'ALL_ORG_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

function isMembershipOf(member: TOrganizationTeamEmployee, userId: string): boolean {
	const matchesEmployeeUserId = member.employee?.userId === userId;
	const matchesEmployeeUser = member.employee?.user?.id === userId;
	return matchesEmployeeUserId || matchesEmployeeUser;
}

/**
 * Whether the user may invite people into the active team, the team every web invitation goes to. The API accepts
 * team invitations from the team's managers (isManager, or a MANAGER, ADMIN or SUPER_ADMIN team role), from the
 * user who created the team and from holders of an organization-wide permission, so only they get the Invite entries.
 */
export function useCanInviteToActiveTeam(): boolean {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const { myPermissions } = useMyRolePermissionsQuery();

	if (!user) {
		return false;
	}

	const holdsOrganizationWidePermission = ORGANIZATION_WIDE_PERMISSIONS.some((permission) =>
		myPermissions.includes(permission)
	);
	const managesActiveTeam = activeTeamManagers.some((member) => isMembershipOf(member, user.id));
	const createdActiveTeam = activeTeam?.createdByUserId === user.id;

	return holdsOrganizationWidePermission || managesActiveTeam || createdActiveTeam;
}
