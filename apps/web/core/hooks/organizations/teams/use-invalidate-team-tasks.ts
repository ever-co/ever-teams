// hooks/use-invalidate-team-tasks.ts
import { queryKeys } from '@/core/query/keys';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useCurrentTeam } from './use-current-team';

/**
 * Hook providing a function to invalidate all task-related queries.
 * Useful after any task mutation to refresh UI state.
 *
 * @returns Memoized invalidation function
 */
export const useInvalidateTeamTasks = () => {
	const queryClient = useQueryClient();
	const activeTeam = useCurrentTeam();

	const invalidateTeamTasksData = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.tasks.all
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.tasks.byTeam(activeTeam?.id)
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.dailyPlans.all
		});
	}, [activeTeam?.id, queryClient]);

	return invalidateTeamTasksData;
};
