import { activeTeamTaskId } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { taskService } from '@/core/services/client/api';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentTeam } from './use-current-team';
import { useMemo, useState } from 'react';

/** Default garbage collection time for task queries (1 hour) */
const TASK_QUERY_GC_TIME = 1000 * 60 * 60;

/**
 * Fetches all tasks for the current team's first project.
 *
 * Uses the active team context to determine which project's tasks to fetch.
 * Query is automatically disabled when no team is selected.
 *
 * @returns TanStack Query result with paginated task data
 *
 * @example
 * const { data, isLoading, error } = useCurrentTeamTasksQuery();
 * const tasks = data?.items ?? [];
 */
export const useCurrentTeamTasksQuery = () => {
	const activeTeam = useCurrentTeam();

	return useQuery({
		queryKey: queryKeys.tasks.byTeam(activeTeam?.id),
		queryFn: async () => {
			if (!activeTeam?.id) {
				throw new Error('Required parameters missing');
			}

			const projectId = activeTeam?.projects && activeTeam.projects.length > 0 ? activeTeam.projects[0].id : '';

			return await taskService.getTasks({ projectId });
		},
		enabled: !!activeTeam?.id,
		gcTime: TASK_QUERY_GC_TIME
	});
};

/**
 * Fetches the currently active task details by ID.
 *
 * Reads the active task ID from Jotai store and fetches full task data.
 * Query is automatically disabled when no task is active.
 *
 * @returns TanStack Query result with task details
 *
 * @example
 * const { data: activeTask, isLoading } = useGetCurrentActiveTaskQuery();
 * if (activeTask) {
 *   console.log('Working on:', activeTask.title);
 * }
 */
export const useGetCurrentActiveTaskQuery = () => {
	const { id: taskId } = useAtomValue(activeTeamTaskId);

	return useQuery({
		queryKey: queryKeys.tasks.detail(taskId),
		queryFn: async () => {
			if (!taskId) {
				throw new Error('Task ID is required');
			}

			return await taskService.getTaskById(taskId);
		},
		enabled: !!taskId,
		gcTime: TASK_QUERY_GC_TIME
	});
};

export const useGetTaskByIdQuery = (taskId?: string) => {
	const query = useQuery({
		queryKey: queryKeys.tasks.byTeam(taskId),
		queryFn: async () => {
			if (!taskId) throw new Error('Required parameters missing');
			return await taskService.getTaskById(taskId);
		},
		enabled: !!taskId,
		gcTime: TASK_QUERY_GC_TIME
	});

	return query;
};

export const useGetTaskByIdQueryLazy = () => {
	const queryClient = useQueryClient();
	const [queryKey, setQueryKey] = useState<ReturnType<typeof queryKeys.tasks.byTeam> | null>(null);
	const state = queryClient.getQueryState(queryKey ?? ['_none']);

	const status = useMemo(
		() => ({
			isError: state?.status == 'error',
			isPending: state?.status == 'pending',
			isSuccess: state?.status == 'success',
			isLoading: state?.status == 'pending' && state?.fetchStatus == 'fetching'
		}),
		[state?.status, state?.fetchStatus]
	);

	const getTaskById = (taskId: string) => {
		return queryClient.fetchQuery({
			queryKey: queryKeys.tasks.byTeam(taskId),
			queryFn: async ({ queryKey }) => {
				setQueryKey(queryKey);
				if (!taskId) throw new Error('Required parameters missing');
				return await taskService.getTaskById(taskId);
			},
			gcTime: TASK_QUERY_GC_TIME
		});
	};

	return { getTaskById, ...state, ...status };
};
