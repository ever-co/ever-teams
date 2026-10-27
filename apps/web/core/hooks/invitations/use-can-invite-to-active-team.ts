'use client';

import { useMemo } from 'react';
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
 * The team side of that rule is {@link useIsMemberManager}'s `isTeamManager`, computed on the active team. Until the
 * permissions load, only a team manager is let through: for a holder of an organization-wide permission the action
 * may appear late, never early. An invitation always names the active team (`useSendTeamInvitation` refuses to send
 * without one), so nobody is offered the action while no team is active.
 *
 * @returns True when the current user may invite into the active team.
 */
export function useCanInviteToActiveTeam(): boolean {
	const { data: user } = useUserQuery();
	const { isTeamManager, activeTeam } = useIsMemberManager(user);
	const { myPermissions } = useMyRolePermissionsQuery();
	const hasActiveTeam = Boolean(activeTeam?.id);

	return useMemo(
		() =>
			hasActiveTeam &&
			(isTeamManager ||
				ORGANIZATION_WIDE_INVITE_PERMISSIONS.some((permission) => myPermissions.includes(permission))),
		[hasActiveTeam, isTeamManager, myPermissions]
	);
}
