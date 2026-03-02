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
	}, [queryClient]);

	return {
		invalidateDailyPlanData
	};
}
