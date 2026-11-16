'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { boardInviteeIdsOf } from '@/core/lib/notifications/board-invitations';
import { employeeNotificationService } from '@/core/services/client/api/notifications/employee-notification.service';
import { activeTeamState } from '@/core/stores';

/** The most invitees Gauzy takes in one request (`MAX_BOARD_INVITEES` in its `board-invitation.ts`). */
const MAX_INVITEES_PER_REQUEST = 50;

/**
 * Invites the people picked in Collaborate to the Board opened with them (#5022): each of them who is a member of the
 * active team finds an invitation in their Inbox. A large selection goes out in several requests, as Gauzy refuses one
 * naming more than 50. Best effort: the Board opens whether the invitations go out or not.
 */
export function useBoardInvitations() {
	const activeTeam = useAtomValue(activeTeamState);

	return useCallback(
		(pickedUserIds: readonly string[]) => {
			const organizationTeamId = activeTeam?.id;
			const receiverEmployeeIds = boardInviteeIdsOf(pickedUserIds, activeTeam?.members ?? []);
			if (!organizationTeamId) {
				return;
			}
			for (let start = 0; start < receiverEmployeeIds.length; start += MAX_INVITEES_PER_REQUEST) {
				void employeeNotificationService
					.inviteToBoard({
						organizationTeamId,
						receiverEmployeeIds: receiverEmployeeIds.slice(start, start + MAX_INVITEES_PER_REQUEST)
					})
					.catch(() => undefined);
			}
		},
		[activeTeam?.id, activeTeam?.members]
	);
}
