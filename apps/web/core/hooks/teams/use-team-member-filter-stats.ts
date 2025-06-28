import { useMemo } from 'react';
import { TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';
import { ETimerStatus } from '@/core/types/generics/enums/timer';

// Type for filter statistics
export interface TeamMemberFilterStats {
	all: number;
	idle: number;
	online: number;
	running: number;
	pause: number;
	suspended: number;
}

// Initial filter stats
const INITIAL_FILTER_STATS: TeamMemberFilterStats = {
	all: 0,
	idle: 0,
	online: 0,
	running: 0,
	pause: 0,
	suspended: 0
};

/**
 * Custom hook for calculating team member filter statistics
 * Centralizes the counting logic to match filtering behavior
 */
export const useTeamMemberFilterStats = (
	allMembers: TOrganizationTeamEmployee[],
	user: TUser | undefined
): TeamMemberFilterStats => {
	return useMemo(() => {
		if (!allMembers.length) return INITIAL_FILTER_STATS;

		const stats = allMembers.reduce<TeamMemberFilterStats>(
			(acc, member) => {
				// Count for 'all' filter
				acc.all += 1;

				// Enhanced status logic matching the filter conditions
				if (!member.timerStatus) {
					// New users without timer status are considered 'idle'
					acc.idle += 1;
				} else {
					// Count based on actual timer status
					switch (member.timerStatus) {
						case ETimerStatus.IDLE:
							acc.idle += 1;
							break;
						case ETimerStatus.ONLINE:
							acc.online += 1;
							break;
						case ETimerStatus.RUNNING:
							acc.running += 1;
							break;
						case ETimerStatus.PAUSE:
							acc.pause += 1;
							break;
						case ETimerStatus.SUSPENDED:
							acc.suspended += 1;
							break;
						default:
							// Handle any other status as idle
							acc.idle += 1;
							break;
					}
				}

				// IMPORTANT: Current user should ALWAYS be counted as 'online' when authenticated
				// regardless of their timer status (matching the filter logic)
				if (member.employee?.user?.id === user?.id) {
					acc.online += 1;
				}

				return acc;
			},
			{ ...INITIAL_FILTER_STATS }
		);

		return stats;
	}, [allMembers, user?.id]);
};

/**
 * Hook that provides filter stats with proper typing for UI components
 */
export const useTeamMemberFilterStatsForUI = (
	allMembers: TOrganizationTeamEmployee[],
	user: TUser | undefined
) => {
	const stats = useTeamMemberFilterStats(allMembers, user);

	// Convert to format expected by UI components
	const filterStats = useMemo(() => ({
		all: stats.all,
		idle: stats.idle,
		online: stats.online,
		running: stats.running,
		pause: stats.pause,
		suspended: stats.suspended
	}), [stats]);

	return filterStats;
};
