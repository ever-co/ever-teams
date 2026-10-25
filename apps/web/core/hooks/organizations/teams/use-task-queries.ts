'use client';

import { taskService } from '@/core/services/client/api';
import { activeTeamState, detailedTaskState, tasksByTeamState } from '@/core/stores';
import { useCallback, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useSyncRef } from '../../common/use-sync-ref';
import { useQueryCall } from '../../common/use-query';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useTasksByEmployeeQuery } from './use-tasks-by-employee-query';

/** A `getTaskById` call that failed: the task it asked for and the error it got. */
type TGetTaskByIdError = { taskId: string; error: unknown };

/**
 * Hook for specific task queries (individual task fetching operations).
 *
 * This hook provides:
 * - Get task by ID
 * - Get tasks by employee ID
 * - Detailed task state
 * - Loading states
 *
 * @returns Object containing:
 * - `getTaskById` - Function to fetch a single task
 * - `getTasksByIdLoading` - Task fetch loading state
 * - `getTaskByIdError` - The last failed task fetch (task id and error), cleared by the next successful one
 * - `getTasksByEmployeeId` - Function to fetch tasks by employee
 * - `getTasksByEmployeeIdLoading` - Employee tasks loading state
 * - `detailedTask` - Currently detailed task data
 */
export function useTaskQueries() {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const tasks = useAtomValue(tasksByTeamState);
	const tasksRef = useSyncRef(tasks);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
	// getTaskById resolves to null on failure for its callers; the task page reads the failure from here
	const [getTaskByIdError, setGetTaskByIdError] = useState<TGetTaskByIdError | null>(null);

	const { getTasksByEmployeeId, getTasksByEmployeeIdLoading } = useTasksByEmployeeQuery(undefined, activeTeam?.id);

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
			// First check local tasks. The list copy has no detail-only relations (linked issues, estimations,
			// creator): merge it into the detail already shown instead of replacing it, so they do not vanish and
			// come back after every edit on the task page.
			if (updateState) {
				const localTask = tasksRef.current.find((task) => task.id === taskId);
				if (localTask) {
					setDetailedTask((current) => (current?.id === taskId ? { ...current, ...localTask } : localTask));
				}
			}

			try {
				const res = await getTaskByIdQuery(taskId);
				setGetTaskByIdError(null);
				if (updateState) {
					setDetailedTask(res || null);
				}
				return res;
			} catch (error) {
				console.error('Error fetching task by ID:', error);
				setGetTaskByIdError({ taskId, error });
				return null;
			}
		},
		[getTaskByIdQuery, setDetailedTask, tasksRef]
	);

	return {
		getTaskById,
		getTasksByIdLoading,
		getTaskByIdError,
		getTasksByEmployeeId,
		getTasksByEmployeeIdLoading,
		detailedTask,
		setDetailedTask
	};
}
