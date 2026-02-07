'use client';

import { getActiveUserTaskCookie, setActiveTaskIdCookie, setActiveUserTaskCookie } from '@/core/lib/helpers/index';
import { taskService } from '@/core/services/client/api';
import { activeTeamState, activeTeamTaskId, detailedTaskState, teamTasksState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';

/**
 * Hook for updating team tasks (UPDATE operations only).
 *
 * This hook provides:
 * - Task update mutation
 * - Title, description, publicity update helpers
 * - Status update handler
 * - Loading state
 * - Automatic cache invalidation and Jotai sync
 *
 * @returns Object containing:
 * - `updateTask` - Function to update a task
 * - `updateLoading` - Mutation pending state
 * - `updateTitle` - Helper to update task title
 * - `updateDescription` - Helper to update task description
 * - `updatePublicity` - Helper to update task publicity
 * - `handleStatusUpdate` - Helper to update task status fields
 */
export function useUpdateTask() {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const setAllTasks = useSetAtom(teamTasksState);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
	const setActive = useSetAtom(activeTeamTaskId);

	const { invalidateTeamTasksData } = useInvalidateTeamTasks();

	// Update mutation
	const updateTaskMutation = useMutation({
		mutationFn: async ({ taskId, taskData }: { taskId: string; taskData: Partial<TTask> }) => {
			return await taskService.updateTask({ taskId, data: taskData });
		},
		onSuccess: (updatedTask, { taskId }) => {
			queryClient.setQueryData(queryKeys.tasks.byTeam(activeTeam?.id), (oldTasks: PaginationResponse<TTask>) => {
				if (!oldTasks) return oldTasks;

				const updatedItems = oldTasks?.items?.map((task) =>
					task.id === taskId ? { ...task, ...updatedTask } : task
				);

				// Sync the tasks store
				setAllTasks(updatedItems);

				return updatedItems ? { items: updatedItems, total: updatedItems.length } : oldTasks;
			});

			// Update detailed task state if this task is currently viewed
			if (detailedTask?.id === taskId) {
				setDetailedTask({ ...detailedTask, ...updatedTask });
			}

			// Invalidate for cache consistency
			invalidateTeamTasksData(taskId);
		}
	});

	const updateTask = useCallback(
		async (task: Partial<TTask> & { id: string }) => {
			try {
				const res = await updateTaskMutation.mutateAsync({
					taskId: task.id,
					taskData: task
				});
				setActive({
					id: ''
				});

				return res;
			} catch (error) {
				console.error('Error updating task:', error);
				throw error;
			}
		},
		[updateTaskMutation, setActive]
	);

	const updateTitle = useCallback(
		async ({
			newTitle,
			task,
			isDetailedTask
		}: {
			newTitle: string;
			task?: TTask | null;
			loader?: boolean;
			isDetailedTask?: boolean;
		}) => {
			if (task && newTitle !== task.title) {
				const res = await updateTask({
					...task,
					title: newTitle
				});
				if (isDetailedTask) {
					setDetailedTask(res);
				}
				return res;
			}
			return undefined;
		},
		[updateTask, setDetailedTask]
	);

	const updateDescription = useCallback(
		async ({
			newDescription,
			task,
			isDetailedTask
		}: {
			newDescription: string;
			task?: TTask | null;
			loader?: boolean;
			isDetailedTask?: boolean;
		}) => {
			if (task && newDescription !== task.description) {
				const res = await updateTask({
					...task,
					description: newDescription
				});
				if (isDetailedTask) {
					setDetailedTask(res);
				}
				return res;
			}
			return undefined;
		},
		[updateTask, setDetailedTask]
	);

	const updatePublicity = useCallback(
		async ({
			publicity,
			task,
			isDetailedTask
		}: {
			publicity: boolean;
			task?: TTask | null;
			loader?: boolean;
			isDetailedTask?: boolean;
		}) => {
			if (task && publicity !== task.public) {
				const res = await updateTask({
					...task,
					public: publicity
				});
				if (isDetailedTask) {
					setDetailedTask({
						...detailedTask,
						public: res.public
					} as TTask);
				}
				return res;
			}
			return undefined;
		},
		[updateTask, setDetailedTask, detailedTask]
	);

	const handleStatusUpdate = useCallback(
		<T extends ITaskStatusField>(
			status: ITaskStatusStack[T],
			field: T,
			taskStatusId: TTask['taskStatusId'],
			task?: TTask | null,
			_loader?: boolean
		) => {
			if (task && status !== (task as any)[field]) {
				if (field === 'status' && status === 'closed') {
					const active_user_task = getActiveUserTaskCookie();
					if (active_user_task?.taskId === task.id) {
						setActiveUserTaskCookie({
							taskId: '',
							userId: ''
						});
					}
					const active_task_id = globalThis?.localStorage?.getItem('active-task-id') || '';
					if (active_task_id === task.id) {
						setActiveTaskIdCookie('');
					}
				}

				return updateTask({
					...task,
					taskStatusId: taskStatusId ?? task.taskStatusId,
					[field]: status
				});
			}
		},
		[updateTask]
	);

	return {
		updateTask,
		updateLoading: updateTaskMutation.isPending,
		updateTitle,
		updateDescription,
		updatePublicity,
		handleStatusUpdate,
		invalidateTeamTasksData
	};
}
