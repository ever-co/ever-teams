'use client';

import { queryKeys } from '@/core/query/keys';
import { dailyPlanService } from '@/core/services/client/api';
import { useQuery } from '@tanstack/react-query';
import { useCurrentTeam } from '../../organizations/teams/use-current-team';
import { IUseDailyPlanOptions } from './use-daily-plan-options';
import { DAILY_PLAN_QUERY_GC_TIME } from './constants';

/**
 * Hook to fetch all daily plans for the current team.
 *
 * This hook retrieves team-wide daily plans, useful for:
 * - Admin views showing all team members' plans
 * - Team dashboard with aggregated plan data
 * - Reports and analytics
 *
 * @param options - Configuration options for the query
 * @returns React Query result with all team daily plans
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, isLoading, error } = useAllDailyPlansQuery();
 *
 * // With conditional fetching
 * const { data } = useAllDailyPlansQuery({ enabled: isAdmin });
 *
 * // Accessing the plans
 * const plans = data?.items ?? [];
 * const totalCount = data?.total ?? 0;
 * ```
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
