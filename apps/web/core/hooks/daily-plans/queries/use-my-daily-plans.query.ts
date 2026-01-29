'use client';

import { queryKeys } from '@/core/query/keys';
import { dailyPlanService } from '@/core/services/client/api';
import { useQuery } from '@tanstack/react-query';
import { useCurrentTeam } from '../../organizations/teams/use-current-team';
import { IUseDailyPlanOptions } from './use-daily-plan-options';
import { DAILY_PLAN_QUERY_GC_TIME } from './constants';

/**
 * Hook to fetch daily plans for the currently authenticated user.
 *
 * This hook is the primary way to get the logged-in user's plans.
 * Use this for:
 * - Personal dashboard
 * - "My Plans" views
 * - Home modal daily plan section
 *
 * @returns React Query result with current user's daily plans
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, isLoading } = useMyDailyPlansQuery();
 *
 * // With lazy loading (e.g., accordion)
 * const [isExpanded, setIsExpanded] = useState(false);
 * const { data } = useMyDailyPlansQuery({ enabled: isExpanded });
 *
 * // Access plans
 * const myPlans = data?.items ?? [];
 * ```
 */
export function useMyDailyPlansQuery(options: IUseDailyPlanOptions = {}) {
	const { enabled = true } = options;

	// Get current team context
	const activeTeam = useCurrentTeam();
	const teamId = activeTeam?.id ?? null;

	return useQuery({
		queryKey: queryKeys.dailyPlans.myPlans(teamId),

		queryFn: async () => {
			// Fetch daily plans for the current user
			const response = await dailyPlanService.getMyDailyPlans();

			return response;
		},

		// Only enable when we have a team ID and enabled is true
		enabled: enabled && !!teamId,
		// Default stale time - user's plans may change more frequently
		staleTime: DAILY_PLAN_QUERY_GC_TIME
	});
}
