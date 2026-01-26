'use client';
import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useCallback } from 'react';
import { useUpdateTaskMutation } from './use-update-task.mutation';
import { useSetActiveTask } from './use-set-active-task';

/**
 * Hook for handling task status field updates with cookie cleanup.
 * Manages side effects when closing tasks (clears active task cookies).
 *
 * @returns Callback function to update any task status field
 */
export const useHandleStatusUpdate = () => {
	const { mutateAsync: updateTask, ...query } = useUpdateTaskMutation();
	const { setActiveTask } = useSetActiveTask();

	/**
	 * Updates a specific status field on a task.
	 * Handles special logic for closing tasks (clears active task cookies).
	 *
	 * @template T - The status field type being updated
	 * @param status - The new status value to set
	 * @param field - The field name to update (e.g., 'status', 'priority')
	 * @param taskStatusId - Optional new taskStatusId to associate
	 * @param task - The task object to update
	 * @param loader - Unused parameter (kept for API compatibility)
	 * @returns Promise from updateTask mutation or undefined if no update needed
	 */
	const handleStatusUpdate = useCallback(
		<T extends ITaskStatusField>(
			status: ITaskStatusStack[T],
			field: T,
			taskStatusId: TTask['taskStatusId'],
			task?: TTask | null,
			loader?: boolean
		) => {
			// Skip update if task doesn't exist or status hasn't changed
			if (task && status !== (task as any)[field]) {
				// Special handling: clear active task cookies when closing a task
				if (field === 'status' && status === 'closed') {
					const active_user_task = getActiveUserTaskCookie();

					// Clear user's active task cookie if it matches this task
					if (active_user_task?.taskId === task.id) {
						setActiveUserTaskCookie({
							taskId: '',
							userId: ''
						});
					}
					const active_task_id = getActiveTaskIdCookie();

					// Clear global active task cookie if it matches this task
					if (active_task_id === task.id) {
						setActiveTaskIdCookie('');
					}
				}

				// Persist the status update via mutation
				return updateTask({
					taskId: task.id,
					taskData: { ...task, taskStatusId: taskStatusId ?? task.taskStatusId, [field]: status }
				}).then((task) => {
					setActiveTask(task);
					return task;
				});
			}
		},
		[updateTask]
	);
	return { handleStatusUpdate, ...query };
};
