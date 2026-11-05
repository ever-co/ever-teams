'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { canMemberTrackTime } from '@/core/lib/helpers/team-member-tracking';
import { activeTeamState } from '@/core/stores';

/**
 * A member of the active team, found by its id: a component rendered once per member re-renders when that member's
 * data changes, not when another member's does. A truthy `legacyId` matches the first member, as the former inline
 * lookup `member.id === memberId || legacyId` did.
 */
export function useActiveTeamMember(memberId: string | undefined, legacyId?: string) {
	const memberAtom = useMemo(
		() =>
			selectAtom(activeTeamState, (activeTeam) =>
				activeTeam?.members?.find((member) => member.id === memberId || legacyId)
			),
		[memberId, legacyId]
	);
	return useAtomValue(memberAtom);
}

/** The active team's member whose user is `userId`, as the former inline `member.employee?.user?.id === userId`. */
export function useActiveTeamMemberOfUser(userId: string | undefined) {
	const memberAtom = useMemo(
		() =>
			selectAtom(activeTeamState, (activeTeam) =>
				activeTeam?.members?.find((member) => member.employee?.user?.id === userId)
			),
		[userId]
	);
	return useAtomValue(memberAtom);
}

/** Whether this user's membership of the active team has time tracking enabled. */
export function useIsTrackingEnabledFor(userId: string | undefined) {
	const isTrackingEnabledAtom = useMemo(
		() =>
			selectAtom(activeTeamState, (activeTeam) => {
				const members = activeTeam?.members ?? [];
				return members.some((member) => {
					const isUser = member.employee?.userId === userId;
					return isUser && canMemberTrackTime(member);
				});
			}),
		[userId]
	);
	return useAtomValue(isTrackingEnabledAtom);
}

/** The user id of the active team's member whose employee belongs to `employeeUserId` (`member.employee?.userId`). */
export function useActiveTeamMemberUserId(employeeUserId: string | undefined) {
	const userIdAtom = useMemo(
		() =>
			selectAtom(activeTeamState, (activeTeam) => {
				const members = activeTeam?.members ?? [];
				const member = members.find((teamMember) => teamMember.employee?.userId === employeeUserId);
				return member?.employee?.user?.id;
			}),
		[employeeUserId]
	);
	return useAtomValue(userIdAtom);
}
