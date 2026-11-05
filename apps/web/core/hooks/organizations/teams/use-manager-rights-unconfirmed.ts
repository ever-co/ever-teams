'use client';

import { useAtomValue } from 'jotai';
import { isFlaggedTeamManagerState, isTeamManagerState } from '@/core/stores/teams/organization-team';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';

/**
 * Whether the user manages the active team in Ever Teams (role, flag or creator) without the rights the API asks to
 * act for its members (the manager flag, or CHANGE_SELECTED_EMPLOYEE). The member data screens then come back empty,
 * so they say why instead. False until the permissions are read, so the message never flashes.
 */
export function useManagerRightsUnconfirmed(): boolean {
	const managesTeam = useAtomValue(isTeamManagerState);
	const isFlaggedManager = useAtomValue(isFlaggedTeamManagerState);
	const { myPermissions, isSuccess: arePermissionsRead } = useMyRolePermissionsQuery();
	const canActForAnyone = myPermissions.includes('CHANGE_SELECTED_EMPLOYEE');
	const actsForMembers = isFlaggedManager || canActForAnyone;
	const lacksMemberRights = arePermissionsRead && !actsForMembers;
	return managesTeam && lacksMemberRights;
}
