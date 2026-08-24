'use client';

import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { dailyPlanService } from '../../services/client/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';
import { useDailyPlanCalculations } from './use-daily-plan-calculations';
import type { ApiRequestScope } from '@/core/services/client/api-request-scope';
import { useFastScopeGuard } from '../bootstrap/use-fast-scope-guard';

export interface UseMyDailyPlansOptions {
	/**
	 * Controls whether the query should be enabled.
	 * Useful for lazy-loading daily plans only when needed.
	 * @default true
	 */
	enabled?: boolean;
	/** Captured request identity for the fast bootstrap path. */
	scope?: ApiRequestScope;
	/** Optional declarative refresh interval. Legacy callers keep the existing no-interval behavior. */
	refetchInterval?: number | false;
}

/**
 * Hook for fetching and managing daily plans for the CURRENT USER only.
 * This hook is optimized for "my data" use cases and does not support viewing other employees' plans.
 *
 * Use this hook when:
 * - Displaying the current user's daily plans
 * - Showing "my" outstanding tasks
 * - Timer integration (checking if user has a plan)
 * - Personal dashboard views
 *
 * For viewing other employees' plans, use `useEmployeeDailyPlans(employeeId)` instead.
 * For team-wide operations, use `useTeamDailyPlans()` instead.
 *
 * @param options - Optional configuration
 * @param options.enabled - Controls whether queries should be enabled. Defaults to true.
 *
 * @example
 * ```typescript
 * // Simple usage
 * const { myTodayPlan, myOutstandingPlans } = useMyDailyPlans();
 *
 * // With conditional loading
 * const { myDailyPlans, isLoading } = useMyDailyPlans({ enabled: isModalOpen });
 * ```
 */
export function useMyDailyPlans(options?: UseMyDailyPlansOptions) {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const allTeamTasks = useAtomValue(tasksByTeamState);

	// Extract options with defaults
	const { enabled = true, scope, refetchInterval = false } = options || {};
	const scoped = scope !== undefined;
	const queryKey = scoped
		? queryKeys.dailyPlans.myPlansByScope(scope.tenantId, scope.organizationId, scope.teamId, scope.userId)
		: queryKeys.dailyPlans.myPlans(activeTeam?.id);
	const isCurrentScope = useFastScopeGuard(queryKey, scoped && enabled);
	const scopedReady = !!(
		scope?.tenantId &&
		scope.organizationId &&
		scope.teamId &&
		scope.userId &&
		scope.accessToken
	);

	// ==================== QUERY ====================

	const getMyDailyPlansQuery = useQuery({
		queryKey,
		queryFn: async ({ signal }) => {
			const res = scoped
				? await dailyPlanService.getMyDailyPlans({ scope: scope!, signal })
				: await dailyPlanService.getMyDailyPlans();
			return res;
		},
		enabled: scoped ? enabled && scopedReady : enabled && !!activeTeam?.id,
		gcTime: 1000 * 60 * 60, // 1 hour
		refetchInterval: scoped ? refetchInterval : false,
		refetchIntervalInBackground: false
	});

	// ==================== DERIVED STATE ====================

	const calculations = useDailyPlanCalculations(
		getMyDailyPlansQuery.data,
		allTeamTasks,
		user?.employee?.id,
		activeTeam
	);

	// ==================== QUERY FUNCTIONS ====================

	const getMyDailyPlans = useCallback(async () => {
		try {
			const res = await getMyDailyPlansQuery.refetch();

			if (res) {
				return res.data;
			} else {
				console.error('Error fetching my daily plans');
			}
		} catch (error) {
			console.error('Error fetching my daily plans:', error);
		}
	}, [getMyDailyPlansQuery]);

	const loadMyDailyPlans = useCallback(async () => {
		await getMyDailyPlans();
		// Data is automatically available via React Query cache
	}, [getMyDailyPlans]);

	const firstLoadMyDailyPlans = useCallback(async () => {
		await loadMyDailyPlans();
	}, [loadMyDailyPlans]);

	return {
		// Raw data
		myDailyPlans: getMyDailyPlansQuery.data || { items: [], total: 0 },

		// Derived state (with "my" prefix for clarity)
		myTodayPlan: calculations.todayPlan,
		myFuturePlans: calculations.futurePlans,
		myPastPlans: calculations.pastPlans,
		myOutstandingPlans: calculations.outstandingPlans,
		myTodayTasks: calculations.todayTasks,
		myFutureTasks: calculations.futureTasks,
		mySortedPlans: calculations.sortedPlans,

		// Query functions
		getMyDailyPlans,
		loadMyDailyPlans,
		firstLoadMyDailyPlans,

		// Loading states
		isLoading: getMyDailyPlansQuery.isLoading,
		isFetching: getMyDailyPlansQuery.isFetching,
		isSuccess: getMyDailyPlansQuery.isSuccess && (!scoped || isCurrentScope()),
		isError: getMyDailyPlansQuery.isError,
		error: getMyDailyPlansQuery.error
	};
}
