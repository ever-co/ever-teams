import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';
import { useMemo } from 'react';
import { useCurrentTeam } from '../organizations/teams/use-current-team';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Hook to calculate the total time worked today by the current user in the active team.
 *
 * WHY THIS HOOK EXISTS:
 * - Timer and MinTimerFrame components were using `timerStatus?.duration` from `/timesheet/timer/status` API
 * - That value is GLOBAL (not scoped by team) and doesn't change when switching teams
 * - This caused incorrect timer display when stopped, showing wrong accumulated time
 *
 * SOLUTION:
 * - Uses `totalTodayTasks` from team member data (same as TodayWorkedTime component)
 * - This value is team-scoped and automatically updates when switching teams
 * - Ensures consistency across all timer-related components
 *
 * @param memberInfo - Optional member info. If not provided, uses the authenticated user.
 * @returns Object with hours, minutes, seconds, and total seconds worked today
 */
export function useTodayWorkedTime(memberInfo?: { member?: { id?: string }; id?: string }) {
	const activeTeam = useCurrentTeam();
	const { data: user } = useUserQuery();

	// Find the current member in the active team
	const currentMember = useMemo(() => {
		if (memberInfo?.member?.id || memberInfo?.id) {
			// If memberInfo is provided, find that specific member
			return activeTeam?.members?.find(
				(member) => member.id === memberInfo?.member?.id || member.id === memberInfo?.id
			);
		}
		// Otherwise, find the authenticated user
		return activeTeam?.members?.find((member) => member.employee?.userId === user?.id);
	}, [activeTeam?.members, memberInfo?.member?.id, memberInfo?.id, user?.id]);

	// Calculate total time worked today from totalTodayTasks
	const totalSeconds = useMemo(() => {
		if (!currentMember?.totalTodayTasks || currentMember.totalTodayTasks.length === 0) {
			return 0;
		}

		return currentMember.totalTodayTasks.reduce(
			(previousValue: number, currentValue: TTaskStatistic) => previousValue + (currentValue?.duration || 0),
			0
		);
	}, [currentMember?.totalTodayTasks]);

	// Convert to hours and minutes
	const { hours, minutes, seconds } = useMemo(() => secondsToTime(totalSeconds), [totalSeconds]);

	return {
		hours,
		minutes,
		seconds,
		totalSeconds,
		currentMember
	};
}
