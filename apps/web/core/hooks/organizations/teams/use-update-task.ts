'use client';

import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
import { taskService } from '@/core/services/client/api';
import { activeTeamScopeState, activeTeamTaskId, detailedTaskState, teamTasksState } from '@/core/stores';
import { useCallback, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { TTask } from '@/core/types/schemas/task/task.schema';
import type { ITaskLinkedIssue } from '@/core/types/interfaces/task/task-linked-issue';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { flattenTaskPages } from '@/core/lib/utils/task.utils';
import { useInvalidateTeamTasks } from './use-invalidate-team-tasks';
import { useTaskQueries } from './use-task-queries';
import { refreshAfterTaskUpdate } from './task-update-refresh';
import { useTimesheetInvalidation } from '@/core/hooks/timesheet/use-timesheet-invalidation';

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
function linkedTaskIdsOf(detail: TTask) {
	const links = (detail.linkedIssues ?? []) as ITaskLinkedIssue[];
	const ids: string[] = [];
	for (const link of links) {
		if (link.taskFrom?.id) {
			ids.push(link.taskFrom.id);
		}
		if (link.taskTo?.id) {
			ids.push(link.taskTo.id);
		}
	}
	return ids;
}

/** The detail lists its sub-issues and linked tasks with their status, so editing one of them changes what it shows. */
function isShownInDetail(detail: TTask | null, taskId: string) {
	if (!detail) {
		return false;
	}
	const isChild = (detail.children ?? []).some((child) => child.id === taskId);
	if (isChild) {
		return true;
	}
	return linkedTaskIdsOf(detail).includes(taskId);
}

/** A save answers after the reader may have moved to another task: only the task that was saved takes the answer. */
function mergedIntoDetail(current: TTask | null, taskId: string, changes: Partial<TTask>) {
	if (current?.id !== taskId) {
		return current;
	}
	return { ...current, ...changes } as TTask;
}

export function useUpdateTask() {
	const queryClient = useQueryClient();
	// Ids and projects only, which do not change with the members: this hook runs in each task and member row
	const activeTeam = useAtomValue(activeTeamScopeState);
	const taskListQueryKey = queryKeys.tasks.byTeamByScope(
		activeTeam?.tenantId,
		activeTeam?.organizationId,
		activeTeam?.id,
		activeTeam?.projects?.[0]?.id ?? null
	);
	const scopeFingerprint = JSON.stringify([
		activeTeam?.tenantId ?? null,
		activeTeam?.organizationId ?? null,
		activeTeam?.id ?? null,
		activeTeam?.projects?.[0]?.id ?? null
	]);
	const currentScopeFingerprintRef = useRef(scopeFingerprint);
	currentScopeFingerprintRef.current = scopeFingerprint;
	const setAllTasks = useSetAtom(teamTasksState);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
	const setActive = useSetAtom(activeTeamTaskId);

	const { invalidateTeamTasksData } = useInvalidateTeamTasks();
	const { invalidateTimesheetData } = useTimesheetInvalidation();

	const { getTaskById } = useTaskQueries();

	// Update mutation
	const updateTaskMutation = useMutation({
		mutationFn: async ({
			taskId,
			taskData,
			moveTimeLogs
		}: {
			taskId: string;
			taskData: Partial<TTask>;
			moveTimeLogs?: boolean;
		}) => {
			return await taskService.updateTask({ taskId, data: taskData, moveTimeLogs });
		},
		onMutate: async ({ taskId, taskData }) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({ queryKey: taskListQueryKey });

			// Snapshot the previous value
			const previousTasks =
				queryClient.getQueryData<InfiniteData<PaginationResponse<TTask>, number>>(taskListQueryKey);

			// Optimistically update to the new value
			if (previousTasks?.pages) {
				const optimisticPages = previousTasks.pages.map((page) => ({
					...page,
					items: page.items.map((task) => (task.id === taskId ? { ...task, ...taskData } : task))
				}));

				const optimisticData = { ...previousTasks, pages: optimisticPages };

				// 1. Update React Query Cache
				queryClient.setQueryData(taskListQueryKey, optimisticData);

				// 2. Update Jotai State immediately (for instant UI feedback)
				setAllTasks(flattenTaskPages(optimisticPages));

				// 3. Update Detailed Task State if applicable
				if (detailedTask?.id === taskId) {
					setDetailedTask({ ...detailedTask, ...taskData } as TTask);
				}
			}

			return { previousTasks, queryKey: taskListQueryKey, scopeFingerprint };
		},
		onError: (_err, { taskId }, context) => {
			// Always restore the cache that owned the mutation. Shared mirrors may only
			// be restored while that same scope is still active.
			if (context?.previousTasks?.pages) {
				// Pages may have been loaded since the snapshot: put back only the edited task, keep the rest.
				const previousTask = flattenTaskPages(context.previousTasks.pages).find((task) => task.id === taskId);
				const currentTasks = queryClient.getQueryData<InfiniteData<PaginationResponse<TTask>, number>>(
					context.queryKey
				);
				const restoredTasks =
					previousTask && currentTasks?.pages
						? {
								...currentTasks,
								pages: currentTasks.pages.map((page) => ({
									...page,
									items: page.items.map((task) => (task.id === taskId ? previousTask : task))
								}))
							}
						: context.previousTasks;
				queryClient.setQueryData(context.queryKey, restoredTasks);

				if (context.scopeFingerprint === currentScopeFingerprintRef.current) {
					setAllTasks(flattenTaskPages(restoredTasks.pages));
				}
			}
		},
		onSettled: (data, error, { taskId, moveTimeLogs }) => {
			// The time logs may have moved with the task, so the timesheets and reports that list them are read again
			if (moveTimeLogs) {
				invalidateTimesheetData();
			}
			// A failed update reads every task list and plan again, to be sure of what the server holds
			if (error) {
				invalidateTeamTasksData(taskId);
				return;
			}
			refreshAfterTaskUpdate(queryClient, taskId);
		}
	});

	const updateTaskMutateAsync = updateTaskMutation.mutateAsync;
	const updateTask = useCallback(
		async (task: Partial<TTask> & { id: string }, options?: { moveTimeLogs?: boolean }) => {
			try {
				const res = await updateTaskMutateAsync({
					taskId: task.id,
					taskData: task,
					moveTimeLogs: options?.moveTimeLogs
				});

				setActive({
					id: ''
				});

				// Legacy behavior restoration: Refetch detailed task to ensure server-side computed fields (like logs, computed dates) are fresh.
				// Added safety check: only refetch if we are actually viewing THIS task (prevents legacy "hijack" bug).
				const isShownTask = detailedTask?.id === task.id;
				if (isShownTask) {
					await getTaskById(task.id);
				}
				const isRowOfShownTask = !isShownTask && isShownInDetail(detailedTask, task.id);
				if (isRowOfShownTask && detailedTask) {
					const freshDetail = await getTaskById(detailedTask.id, false);
					if (freshDetail) {
						setDetailedTask((current) => mergedIntoDetail(current, freshDetail.id, freshDetail));
					}
				}

				return res;
			} catch (error) {
				console.error('Error updating task:', error);
				throw error;
			}
		},
		[updateTaskMutateAsync, setActive, detailedTask, getTaskById, setDetailedTask]
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
					setDetailedTask((current) => mergedIntoDetail(current, task.id, res));
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
					setDetailedTask((current) => mergedIntoDetail(current, task.id, res));
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
					setDetailedTask((current) => mergedIntoDetail(current, task.id, { public: res.public }));
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
