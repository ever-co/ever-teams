'use client';

import { taskService } from '@/core/services/client/api';
import { detailedTaskState, tasksByTeamState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useSyncRef, useQueryCall } from '../../common';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook for specific task queries (individual task fetching operations).
 *
 * This hook provides:
 * - Get task by ID
 * - Detailed task state
 * - Loading states
 *
 * @returns Object containing:
 * - `getTaskById` - Function to fetch a single task
 * - `getTasksByIdLoading` - Task fetch loading state
 * - `detailedTask` - Currently detailed task data
 */
export function useTaskQueries() {
	const queryClient = useQueryClient();
	const tasks = useAtomValue(tasksByTeamState);
	const tasksRef = useSyncRef(tasks);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);

	// Query call for getting task by ID
	const { queryCall: getTaskByIdQuery, loading: getTasksByIdLoading } = useQueryCall(async (taskId: string) =>
		queryClient.fetchQuery({
			queryKey: queryKeys.tasks.detail(taskId),
			queryFn: async () => {
				if (!taskId) {
					throw new Error('Task ID is required');
				}
				return await taskService.getTaskById(taskId);
			}
		})
	);

	const getTaskById = useCallback(
		async (taskId: string, updateState = true) => {
			// First check local tasks
			if (updateState) {
				tasksRef.current.forEach((task) => {
					if (task.id === taskId) {
						setDetailedTask(task);
					}
				});
			}

			try {
				const res = await getTaskByIdQuery(taskId);
				if (updateState) {
					setDetailedTask(res || null);
				}
				return res;
			} catch (error) {
				console.error('Error fetching task by ID:', error);
				return null;
			}
		},
		[getTaskByIdQuery, setDetailedTask, tasksRef]
	);

	return {
		getTaskById,
		getTasksByIdLoading,
		detailedTask,
		setDetailedTask
	};
}
