'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/core/query/keys';

/**
 * Shared cache invalidation logic for daily plan mutations.
 * This hook ensures consistent cache invalidation across all daily plan operations.
 *
 * @returns Object containing the invalidation function
 */
export function useDailyPlanInvalidation() {
	const queryClient = useQueryClient();

	const invalidateDailyPlanData = useCallback(() => {
		// Invalidate ALL task queries to ensure synchronization across all contexts
		// Invalidate ALL daily plan queries to ensure synchronization across all contexts
		// This includes myPlans, allPlans, byEmployee, byTask, etc.
		// Similar to invalidateTeamTasksData() in use-team-tasks.ts
		queryClient.invalidateQueries({
			queryKey: queryKeys.tasks.all
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.dailyPlans.all
		});
		// Teams that do not require a plan read the personal plans on demand, with every observer disabled, so the
		// invalidation above refetches nothing there. Refresh the ones already read and still on screen, so the start
		// button sees this change. A fetch already running predates it, hence cancelRefetch.
		queryClient
			.getQueryCache()
			.findAll({ queryKey: queryKeys.dailyPlans.myPlansByScopeAll, type: 'inactive' })
			.filter(
				(query) =>
					query.getObserversCount() > 0 &&
					(query.state.data !== undefined || query.state.fetchStatus === 'fetching')
			)
			.forEach((query) => {
				const refresh = () => query.fetch(undefined, { cancelRefetch: true }).catch(() => undefined);
				if (query.state.data !== undefined) {
					void refresh();
					return;
				}
				// A first read still running is joined instead of cancelled, so the refresh waits for it to land
				void query.fetch().then(refresh, () => undefined);
			});
	}, [queryClient]);

	return {
		invalidateDailyPlanData
	};
}
