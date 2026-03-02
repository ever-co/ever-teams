'use client';

import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
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
import { useTaskQueries } from './use-task-queries';

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

	const { getTaskById } = useTaskQueries();

	// Update mutation
	const updateTaskMutation = useMutation({
		mutationFn: async ({ taskId, taskData }: { taskId: string; taskData: Partial<TTask> }) => {
			return await taskService.updateTask({ taskId, data: taskData });
		},
		onMutate: async ({ taskId, taskData }) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({ queryKey: queryKeys.tasks.byTeam(activeTeam?.id) });

			// Snapshot the previous value
			const previousTasks = queryClient.getQueryData<PaginationResponse<TTask>>(
				queryKeys.tasks.byTeam(activeTeam?.id)
			);

			// Optimistically update to the new value
			if (previousTasks?.items) {
				const optimisticTasksItems = previousTasks.items.map((task) =>
					task.id === taskId ? { ...task, ...taskData } : task
				);

				const optimisticData = { ...previousTasks, items: optimisticTasksItems };

				// 1. Update React Query Cache
				queryClient.setQueryData(queryKeys.tasks.byTeam(activeTeam?.id), optimisticData);

				// 2. Update Jotai State immediately (for instant UI feedback)
				setAllTasks(optimisticTasksItems as TTask[]);

				// 3. Update Detailed Task State if applicable
				if (detailedTask?.id === taskId) {
					setDetailedTask({ ...detailedTask, ...taskData } as TTask);
				}
			}

			return { previousTasks };
		},
		onError: (_err, _newTodo, context) => {
			// Rollback to the previous value
			if (context?.previousTasks) {
				queryClient.setQueryData(queryKeys.tasks.byTeam(activeTeam?.id), context.previousTasks);

				if (context.previousTasks.items) {
					setAllTasks(context.previousTasks.items);
				}
			}
		},
		onSettled: (data, error, { taskId }) => {
			// Always refetch after error or success to ensure server consistency
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

				// Legacy behavior restoration: Refetch detailed task to ensure server-side computed fields (like logs, computed dates) are fresh.
				// Added safety check: only refetch if we are actually viewing THIS task (prevents legacy "hijack" bug).
				if (detailedTask?.id === task.id) {
					await getTaskById(task.id);
				}

				return res;
			} catch (error) {
				console.error('Error updating task:', error);
				throw error;
			}
		},
		[updateTaskMutation, setActive, detailedTask, getTaskById]
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
					setDetailedTask((current) => (current ? { ...current, ...res } : current));
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
					setDetailedTask((current) => (current ? { ...current, ...res } : current));
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
					setDetailedTask((current) =>
						current
							? ({
									...current,
									public: res.public
								} as TTask)
							: current
					);
				}
				return res;
			}
			return undefined;
		},
		[updateTask, setDetailedTask]
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
					const active_task_id = getActiveTaskIdCookie() ?? '';
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
