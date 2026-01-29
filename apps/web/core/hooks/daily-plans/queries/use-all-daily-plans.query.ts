'use client';

import { queryKeys } from '@/core/query/keys';
import { dailyPlanService } from '@/core/services/client/api';
import { useQuery } from '@tanstack/react-query';
import { useCurrentTeam } from '../../organizations/teams/use-current-team';
import { IUseDailyPlanOptions } from './use-daily-plan-options';
import { DAILY_PLAN_QUERY_GC_TIME } from './constants';

/**
 * Fetches all daily plans for the current team.
 * Useful for manager views or team-wide dashboards.
 */
export function useAllDailyPlansQuery(options: IUseDailyPlanOptions = {}) {
	const { enabled = true } = options;
	// Get current team context
	const activeTeam = useCurrentTeam();
	const teamId = activeTeam?.id ?? null;

	const query = useQuery({
		queryKey: queryKeys.dailyPlans.allPlans(teamId),
		queryFn: async () => {
			// Fetch all daily plans for the team
			const res = await dailyPlanService.getAllDayPlans();

			return res;
		},
		// Only enable when we have a team ID and enabled is true
		enabled: enabled && !!teamId,
		// Default stale time - plans don't change frequently
		staleTime: DAILY_PLAN_QUERY_GC_TIME
	});

	return query;
}
