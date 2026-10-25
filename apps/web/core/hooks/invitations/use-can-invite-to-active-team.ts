'use client';

import { useCallback, useContext, useSyncExternalStore } from 'react';
import { notifyManager, QueryClientContext } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { ERoleName } from '@/core/types/generics/enums/role';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TOrganizationTeam, TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';
import { useUserQuery } from '../queries/user-user.query';
import { useMyRolePermissionsQuery } from '../roles/use-my-role-permissions-query';

/** Any one of these lets the API accept invitations into every team of the organization. */
const ORGANIZATION_WIDE_PERMISSIONS = ['ALL_ORG_VIEW', 'ALL_ORG_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

/** Besides the isManager flag, the team roles the API accepts team invitations from. */
const TEAM_MANAGER_ROLES = new Set<string>([ERoleName.MANAGER, ERoleName.ADMIN, ERoleName.SUPER_ADMIN]);

/** The user's team list as useOrganizationTeamsQuery caches it. */
type TCachedTeamList = { data?: PaginationResponse<TOrganizationTeam> };

function isMembershipOf(member: TOrganizationTeamEmployee, userId: string): boolean {
	const matchesEmployeeUserId = member.employee?.userId === userId;
	const matchesEmployeeUser = member.employee?.user?.id === userId;
	return matchesEmployeeUserId || matchesEmployeeUser;
}

function isManagerMembershipOf(member: TOrganizationTeamEmployee, userId: string): boolean {
	const flaggedAsManager = member?.isManager === true;
	const roleName = member?.role?.name ?? '';
	const holdsManagerRole = TEAM_MANAGER_ROLES.has(roleName);
	const managesTeam = flaggedAsManager || holdsManagerRole;
	if (!managesTeam) {
		return false;
	}
	return isMembershipOf(member, userId);
}

function findTeam(teams: TOrganizationTeam[], teamId: string | null): TOrganizationTeam | undefined {
	if (!teamId) {
		return undefined;
	}
	return teams.find((team) => team.id === teamId);
}

const noUnsubscribe = () => undefined;
const noServerTeamList = () => undefined;

/**
 * The user's own teams from the query cache, under the key the shell loads them with. A public team page replaces
 * organizationTeamsState with the team it shows, never this list. The client is read from the context, so where no
 * QueryClientProvider is mounted the list is just empty.
 */
function useCachedOwnTeams(user: TUser | undefined): TOrganizationTeam[] {
	const queryClient = useContext(QueryClientContext);
	const tenantId = user?.employee?.tenantId ?? user?.tenantId;
	const listKey = queryKeys.organizationTeams.listByScope(tenantId, user?.employee?.organizationId, user?.id);

	const subscribe = useCallback(
		(onCacheChange: () => void) => {
			if (!queryClient) {
				return noUnsubscribe;
			}
			const batchedOnCacheChange = notifyManager.batchCalls(onCacheChange);
			return queryClient.getQueryCache().subscribe(batchedOnCacheChange);
		},
		[queryClient]
	);
	const readTeamList = () => queryClient?.getQueryData<TCachedTeamList>(listKey);
	const teamList = useSyncExternalStore(subscribe, readTeamList, noServerTeamList);

	return teamList?.data?.items ?? [];
}

/**
 * Whether the user may invite people into the team the invitations go to: the one the active team cookie names, as
 * useSendTeamInvitation reads it, else the active team. The API accepts team invitations from the team's managers
 * (isManager, or a MANAGER, ADMIN or SUPER_ADMIN team role), from the user who created the team and from holders of an
 * organization-wide permission, so only they get the Invite entries.
 */
export function useCanInviteToActiveTeam(): boolean {
	const { data: user } = useUserQuery();
	const loadedTeams = useAtomValue(organizationTeamsState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const cachedOwnTeams = useCachedOwnTeams(user);
	const { myPermissions } = useMyRolePermissionsQuery();

	if (!user) {
		return false;
	}

	const holdsOrganizationWidePermission = ORGANIZATION_WIDE_PERMISSIONS.some((permission) =>
		myPermissions.includes(permission)
	);
	if (holdsOrganizationWidePermission) {
		return true;
	}

	const cookieTeamId = getActiveTeamIdCookie();
	const targetTeamId = cookieTeamId || activeTeamId;
	// A public team page leaves only the team it shows loaded, so the user's own cached teams are the fallback
	const loadedTargetTeam = findTeam(loadedTeams, targetTeamId);
	const cachedTargetTeam = findTeam(cachedOwnTeams, targetTeamId);
	const targetTeam = loadedTargetTeam ?? cachedTargetTeam;
	if (!targetTeam) {
		// Not loaded yet: keep the entries rather than hide them from someone who may invite
		return true;
	}

	const targetTeamMembers = targetTeam.members ?? [];
	const managesTargetTeam = targetTeamMembers.some((member) => isManagerMembershipOf(member, user.id));
	const createdTargetTeam = targetTeam.createdByUserId === user.id;
	return managesTargetTeam || createdTargetTeam;
}
