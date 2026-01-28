import { detailedTaskIdState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { taskService } from '@/core/services/client/api';
import { useAtom } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { TTask } from '@/core/types/schemas/task/task.schema';

/** Default garbage collection time for task queries (1 hour) */
const TASK_QUERY_GC_TIME = 1000 * 60 * 60;

/**
 * Manages the detailed task view state and data fetching.
 *
 * Combines Jotai state (which task is selected for detail view)
 * with TanStack Query (fetching full task data from API).
 *
 * @returns Object containing:
 * - `detailedTaskId`: Currently selected task ID (or null)
 * - `setDetailedTaskId`: Function to change the selected task
 * - `detailedTaskQuery`: TanStack Query result with full task data
 * - `prefillDetailedTask`: Prefills cache with task data (for hover optimization)
 *
 * @example
 * const { detailedTaskId, setDetailedTaskId, detailedTaskQuery, prefillDetailedTask } = useDetailedTask();
 *
 * // Prefill cache on hover (instant detail view later)
 * <TaskCard onMouseEnter={() => prefillDetailedTask(task)} />
 *
 * // Open task detail panel
 * setDetailedTaskId('task-123');
 *
 * // Access task data (already cached if prefilled!)
 * if (detailedTaskQuery.data) {
 *   console.log('Viewing:', detailedTaskQuery.data.title);
 * }
 *
 * // Close detail panel
 * setDetailedTaskId(null);
 */
export const useDetailedTask = () => {
	const queryClient = useQueryClient();
	const [detailedTaskId, setDetailedTaskId] = useAtom(detailedTaskIdState);

	const detailedTaskQuery = useQuery({
		queryKey: queryKeys.tasks.detail(detailedTaskId),
		queryFn: async () => {
			if (!detailedTaskId) {
				throw new Error('Task ID is required');
			}

			return await taskService.getTaskById(detailedTaskId);
		},
		enabled: !!detailedTaskId,
		gcTime: TASK_QUERY_GC_TIME
	});

	/**
	 * Prefills the cache with task data.
	 * Call this on hover to make detail view instant (no loading state).
	 */
	const prefillDetailedTask = useCallback(
		(task: TTask) => {
			queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
		},
		[queryClient]
	);

	return {
		detailedTaskId,
		setDetailedTaskId,
		detailedTaskQuery,
		prefillDetailedTask
	};
};
