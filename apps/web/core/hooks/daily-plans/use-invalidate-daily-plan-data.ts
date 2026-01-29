import { queryKeys } from '@/core/query/keys';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const useInvalidateDailyPlanData = () => {
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

	return invalidateDailyPlanData;
};
