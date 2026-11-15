'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { boardInviteeIdsOf } from '@/core/lib/notifications/board-invitations';
import { employeeNotificationService } from '@/core/services/client/api/notifications/employee-notification.service';
import { activeTeamState } from '@/core/stores';

/**
 * Invites the people picked in Collaborate to the Board opened with them (#5022): each of them who is a member of the
 * active team finds an invitation in their Inbox. Best effort: the Board opens whether the invitations go out or not.
 */
export function useBoardInvitations() {
	const activeTeam = useAtomValue(activeTeamState);

	return useCallback(
		(pickedUserIds: readonly string[]) => {
			const receiverEmployeeIds = boardInviteeIdsOf(pickedUserIds, activeTeam?.members ?? []);
			if (!activeTeam?.id || receiverEmployeeIds.length === 0) {
				return;
			}
			void employeeNotificationService
				.inviteToBoard({ organizationTeamId: activeTeam.id, receiverEmployeeIds })
				.catch(() => undefined);
		},
		[activeTeam?.id, activeTeam?.members]
	);
}
