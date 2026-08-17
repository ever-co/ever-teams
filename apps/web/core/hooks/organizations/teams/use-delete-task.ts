'use client';

import { setActiveTaskIdCookie } from '@/core/lib/helpers/index';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { taskService } from '@/core/services/client/api';
import { activeTeamTaskState } from '@/core/stores';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

/**
 * Hook for deleting team tasks (DELETE operations only).
 *
 * This hook provides:
 * - Task deletion mutation
 * - Employee removal from tasks
 * - Unassign active task helper
 * - Loading states
 * - Automatic cache invalidation
 *
 * @returns Object containing:
 * - `deleteTask` - Function to delete a task
 * - `deleteLoading` - Delete mutation pending state
 * - `deleteEmployeeFromTasks` - Function to remove employee from all tasks
 * - `deleteEmployeeFromTasksLoading` - Employee removal pending state
 * - `unassignAuthActiveTask` - Function to unassign current user's active task
 */
export function useDeleteTask() {
	const setActiveTeamTask = useSetAtom(activeTeamTaskState);

	const { invalidateTeamTasksData } = useInvalidateTeamTasks();

	// Delete task mutation
	const deleteTaskMutation = useMutation({
		mutationFn: async (taskId: string) => {
			return await taskService.deleteTask(taskId);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	// Delete employee from tasks mutation
	const deleteEmployeeFromTasksMutation = useMutation({
		mutationFn: async (employeeId: string) => {
			return await taskService.deleteEmployeeFromTasks(employeeId);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const deleteTaskMutateAsync = deleteTaskMutation.mutateAsync;
	const deleteTask = useCallback(
		async (task: TTask) => {
			try {
				return await deleteTaskMutateAsync(task.id);
			} catch (error) {
				console.error('Error deleting task:', error);
				throw error;
			}
		},
		[deleteTaskMutateAsync]
	);

	const deleteEmployeeFromTasksMutateAsync = deleteEmployeeFromTasksMutation.mutateAsync;
	const deleteEmployeeFromTasks = useCallback(
		async (employeeId: string) => {
			try {
				await deleteEmployeeFromTasksMutateAsync(employeeId);
			} catch (error) {
				logErrorInDev('Error deleting employee from tasks:', error);
				throw error;
			}
		},
		[deleteEmployeeFromTasksMutateAsync]
	);

	const unassignAuthActiveTask = useCallback(() => {
		setActiveTaskIdCookie('');
		setActiveTeamTask(null);
	}, [setActiveTeamTask]);

	return {
		deleteTask,
		deleteLoading: deleteTaskMutation.isPending,
		deleteEmployeeFromTasks,
		deleteEmployeeFromTasksLoading: deleteEmployeeFromTasksMutation.isPending,
		unassignAuthActiveTask
	};
}
