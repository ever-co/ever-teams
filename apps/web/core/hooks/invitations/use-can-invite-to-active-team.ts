'use client';

import { useCallback, useContext, useSyncExternalStore } from 'react';
import { notifyManager, QueryClientContext } from '@tanstack/react-query';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { ERoleName } from '@/core/types/generics/enums/role';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TOrganizationTeam, TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';
import { useIsMemberManager } from '../organizations/teams/use-team-member';
import { useMyRolePermissionsQuery } from '../roles/use-my-role-permissions-query';
import { useUserQuery } from '../queries/user-user.query';

/**
 * The role permissions that let a user invite into every team of the organization, whether or not they manage it.
 * Mirrors `ORGANIZATION_WIDE_INVITE_GRANTS` in the Gauzy API (`packages/core/src/lib/invite/invite.service.ts`).
 */
export const ORGANIZATION_WIDE_INVITE_PERMISSIONS: readonly string[] = Object.freeze([
	'ALL_ORG_VIEW',
	'ALL_ORG_EDIT',
	'CHANGE_SELECTED_EMPLOYEE'
]);

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

/**
 * The team the invitation goes to, once loaded: the active team when it is that team, else the user's own team from
 * the cached list, since a public team page leaves only the team it shows loaded.
 */
function findTargetTeam(
	teamId: string,
	activeTeam: TOrganizationTeam | null,
	cachedOwnTeams: TOrganizationTeam[]
): TOrganizationTeam | undefined {
	if (activeTeam?.id === teamId) {
		return activeTeam;
	}
	return cachedOwnTeams.find((team) => team.id === teamId);
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
 * Whether the current user may invite people into the active team, so the invite actions are shown only to them.
 *
 * Since ever-co/ever-gauzy#11473 the Gauzy API answers 403 to an invitation into a team the caller does not manage
 * (`InviteService` in `packages/core/src/lib/invite/invite.service.ts`). It accepts the invitation when the caller:
 * - holds one of {@link ORGANIZATION_WIDE_INVITE_PERMISSIONS} (`ALL_ORG_VIEW`, `ALL_ORG_EDIT`,
 *   `CHANGE_SELECTED_EMPLOYEE`), which reach the invitations of every team; or
 * - manages the team: a member flagged `isManager`, a member whose team role is MANAGER, ADMIN or SUPER_ADMIN, or
 *   the team's creator (`createdByUserId`).
 *
 * The team judged is the one the invitation goes to: the team the active team cookie names, as
 * `useSendTeamInvitation` reads it, else the active team {@link useIsMemberManager} resolves. A public team page
 * leaves only the team it shows loaded, so that team is then read from the user's own team list in the query cache.
 * Until the permissions load, only a team manager is let through: for a holder of an organization-wide permission the
 * action may appear late, never early, and so it does for a manager until that team loads. An invitation always
 * names the active team (`useSendTeamInvitation` refuses to send without one), so nobody is offered the action while
 * no team is active.
 *
 * @returns True when the current user may invite into the active team.
 */
export function useCanInviteToActiveTeam(): boolean {
	const { data: user } = useUserQuery();
	const { activeTeam } = useIsMemberManager(user);
	const cachedOwnTeams = useCachedOwnTeams(user);
	const { myPermissions } = useMyRolePermissionsQuery();

	if (!user) {
		return false;
	}

	const cookieTeamId = getActiveTeamIdCookie();
	const activeTeamId = activeTeam?.id;
	const targetTeamId = cookieTeamId || activeTeamId;
	if (!targetTeamId) {
		return false;
	}

	const holdsOrganizationWidePermission = ORGANIZATION_WIDE_INVITE_PERMISSIONS.some((permission) =>
		myPermissions.includes(permission)
	);
	if (holdsOrganizationWidePermission) {
		return true;
	}

	const targetTeam = findTargetTeam(targetTeamId, activeTeam, cachedOwnTeams);
	if (!targetTeam) {
		return false;
	}

	const targetTeamMembers = targetTeam.members ?? [];
	const managesTargetTeam = targetTeamMembers.some((member) => isManagerMembershipOf(member, user.id));
	const createdTargetTeam = targetTeam.createdByUserId === user.id;
	return managesTargetTeam || createdTargetTeam;
}
