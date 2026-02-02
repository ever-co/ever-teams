import { queryKeys } from '@/core/query/keys';
import { activeTeamState } from '@/core/stores';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';

/**
 * Provides cache invalidation for team tasks queries.
 * Call after any task mutation to refresh data.
 *
 * @returns {{ invalidateTeamTasks: () => Promise<void> }}
 */
export const useInvalidateTeamTasksData = () => {
	const activeTeam = useAtomValue(activeTeamState);
	const queryClient = useQueryClient();

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
