import { queryKeys } from '@/core/query/keys';
import { taskService } from '@/core/services/client/api';
import { activeTeamState } from '@/core/stores';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { TASK_QUERY_GC_TIME_HOUR } from '../constants/TASK_QUERY_GC_TIME';
import { useLazyQueryState } from '../utils/use-lazy-query';

/**
 * Fetches all tasks for the current active team.
 * Automatically refetches when team changes.
 *
 * @returns Query result with team tasks array
 */
export const useGetCurrentTeamTasksQuery = () => {
	const activeTeam = useAtomValue(activeTeamState);
	const _projectId = useMemo(
		() => (activeTeam?.projects && activeTeam?.projects.length > 0 ? activeTeam.projects[0].id : ''),
		[activeTeam?.projects]
	);
	const teamId = useMemo(() => activeTeam?.id, [activeTeam?.id]);

	const getTaskByTeamIdQuery = useQuery({
		queryKey: queryKeys.tasks.byTeam(teamId),
		queryFn: async () => {
			if (!teamId) {
				throw new Error('Required parameters missing');
			}
			return await taskService.getTasks({ projectId: _projectId });
		},
		enabled: !!teamId,
		gcTime: TASK_QUERY_GC_TIME_HOUR
	});

	return getTaskByTeamIdQuery;
};

/**
 * Lazy version - only fetches when manually triggered via refetch().
 * Useful for on-demand data loading.
 *
 * @returns Query result with manual refetch control
 */
export const useGetCurrentTeamTasksLazyQuery = () => {
	const activeTeam = useAtomValue(activeTeamState);
	const projectId = useMemo(
		() => (activeTeam?.projects && activeTeam?.projects.length > 0 ? activeTeam.projects[0].id : ''),
		[activeTeam?.projects]
	);
	const teamId = useMemo(() => activeTeam?.id, [activeTeam?.id]);

	// utility for lazy query
	const queryClient = useQueryClient();
	const { setQueryKey, ...state } = useLazyQueryState<ReturnType<typeof queryKeys.tasks.byTeam>>();

	const getCurrentTeamTasks = () => {
		return queryClient.fetchQuery({
			queryKey: queryKeys.tasks.byTeam(teamId),
			queryFn: async ({ queryKey }) => {
				setQueryKey(queryKey);
				if (!teamId) {
					throw new Error('Required parameters missing');
				}
				return await taskService.getTasks({ projectId });
			},
			gcTime: TASK_QUERY_GC_TIME_HOUR
		});
	};

	return { getCurrentTeamTasks, ...state };
};
