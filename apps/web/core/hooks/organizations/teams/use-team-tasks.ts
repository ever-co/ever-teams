'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { getActiveTaskIdCookie, getActiveUserTaskCookie } from '@/core/lib/helpers/index';
import { memberActiveTaskIdState, taskStatusesState, teamTasksState } from '@/core/stores';
import { EIssueType, ETaskPriority, ETaskSize } from '@/core/types/generics/enums/task';
import { ETaskStatusName, TEmployee, TTag } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue, useSetAtom } from 'jotai';
import isEqual from 'lodash/isEqual';
import { useCallback, useRef, useState } from 'react';
import { useAuthenticateUser } from '../../auth';
import { useConditionalUpdateEffect, useFirstLoad, useSyncRef } from '../../common';
import { useUserQuery } from '../../queries/user-user.query';
import { useDetailedTask } from '../../tasks/use-detailed-task';
import { useCreateTaskMutation } from './use-create-task.mutation';
import { useCurrentActiveTask } from './use-current-active-task';
import { useCurrentTeam } from './use-current-team';
import { useDeleteEmployeeFromTasksMutation } from './use-delete-employee-from-tasks.mutation';
import { useDeleteTaskMutation } from './use-delete-task.mutation';
import { useGetTasksByEmployeeIdQueryLazy } from './use-get-task-by-employee-id.query';
import { useCurrentTeamTasksQuery, useGetTaskByIdQueryLazy } from './use-get-team-task.query';
import { useHandleStatusUpdate } from './use-handle-status-update';
import { useSetActiveTask } from './use-set-active-task';
import { useSortedTasksByCreation } from './use-sorted-tasks';
import { useUpdateTaskMutation } from './use-update-task.mutation';

/**
 * @deprecated This monolithic hook has been split into atomic, focused hooks.
 * Each specialized hook provides better separation of concerns, optimized re-renders,
 * and proper TanStack Query cache synchronization.
 *
 * Keep for backward compatibility
 *
 * ## Migration Guide
 *
 * ### Task Queries (Read Operations)
 * | Before (useTeamTasks) | After (New Hook) |
 * |-----------------------|------------------|
 * | `tasks` | `useCurrentTeamTasksQuery()` → `data.items` |
 * | `loading` | `useCurrentTeamTasksQuery()` → `isLoading` |
 * | `getTaskById()` | `useGetTaskByIdQueryLazy()` → `getTaskById()` |
 * | `getTasksByIdLoading` | `useGetTaskByIdQueryLazy()` → `isPending` |
 * | `getTasksByEmployeeId()` | `useGetTasksByEmployeeIdQuery()` |
 * | `getTasksByEmployeeIdLoading` | `useGetTasksByEmployeeIdQuery()` → `isLoading` |
 * | `detailedTask` | `useDetailedTask()` → `detailedTaskQuery.data` |
 * | `loadTeamTasksData()` | `useCurrentTeamTasksQuery()` → `refetch()` |
 *
 * ### Task Mutations (Write Operations)
 * | Before (useTeamTasks) | After (New Hook) |
 * |-----------------------|------------------|
 * | `createTask()` | `useCreateTaskMutation()` → `mutateAsync()` |
 * | `createLoading` | `useCreateTaskMutation()` → `isPending` |
 * | `updateTask()` | `useUpdateTaskMutation()` → `mutateAsync()` |
 * | `updateLoading` | `useUpdateTaskMutation()` → `isPending` |
 * | `updateTitle()` | `useUpdateTaskMutation()` → `mutateAsync({ title })` |
 * | `updateDescription()` | `useUpdateTaskMutation()` → `mutateAsync({ description })` |
 * | `updatePublicity()` | `useUpdateTaskMutation()` → `mutateAsync({ public })` |
 * | `deleteTask()` | `useDeleteTaskMutation()` → `mutateAsync()` |
 * | `deleteLoading` | `useDeleteTaskMutation()` → `isPending` |
 * | `handleStatusUpdate()` | `useHandleStatusUpdate()` → `handleStatusUpdate()` |
 * | `deleteEmployeeFromTasks()` | `useDeleteEmployeeFromTasksMutation()` → `mutateAsync()` |
 * | `deleteEmployeeFromTasksLoading` | `useDeleteEmployeeFromTasksMutation()` → `isPending` |
 *
 * ### Active Task Management
 * | Before (useTeamTasks) | After (New Hook) |
 * |-----------------------|------------------|
 * | `activeTeamTask` | `useCurrentActiveTask()` → `task` |
 * | `setActiveTask()` | `useSetActiveTask()` → `setActiveTask()` |
 * | `isUpdatingActiveTask` | `useSetActiveTask()` → `isPending` |
 * | `unassignAuthActiveTask()` | `useSetActiveTask()` → `setActiveTask(null)` |
 *
 * ### Team & Utility
 * | Before (useTeamTasks) | After (New Hook) |
 * |-----------------------|------------------|
 * | `activeTeam` | `useCurrentTeam()` |
 * | `activeTeamId` | `useCurrentTeam()` → `id` |
 * | `tasks` (sorted) | `useSortedTasksByCreation()` |
 * | `setAllTasks()` | Direct Jotai: `useSetAtom(teamTasksState)` |
 *
 * ## Examples
 *
 * ### Before (Monolithic)
 * ```typescript
 * const {
 *   tasks,
 *   loading,
 *   createTask,
 *   createLoading,
 *   activeTeamTask,
 *   setActiveTask
 * } = useTeamTasks();
 * ```
 *
 * ### After (Atomic Hooks)
 * ```typescript
 * // Only subscribe to what you need - better performance!
 * const { data: tasksResult, isLoading } = useCurrentTeamTasksQuery();
 * const tasks = tasksResult?.items ?? [];
 *
 * const { mutateAsync: createTask, isPending: createLoading } = useCreateTaskMutation();
 *
 * const { task: activeTeamTask } = useCurrentActiveTask();
 * const { setActiveTask } = useSetActiveTask();
 * ```
 *
 * @see useCurrentTeamTasksQuery - Fetch team tasks with TanStack Query
 * @see useGetTaskByIdQueryLazy - Lazy fetch single task by ID
 * @see useGetTasksByEmployeeIdQuery - Fetch tasks assigned to employee
 * @see useDetailedTask - Manage task detail panel state and data
 * @see useCreateTaskMutation - Create new tasks
 * @see useUpdateTaskMutation - Update existing tasks
 * @see useDeleteTaskMutation - Delete tasks
 * @see useHandleStatusUpdate - Update task status fields
 * @see useDeleteEmployeeFromTasksMutation - Remove employee from all tasks
 * @see useCurrentActiveTask - Get current user's active task
 * @see useSetActiveTask - Set/unset active task
 * @see useCurrentTeam - Get current active team
 * @see useSortedTasksByCreation - Get tasks sorted by creation date
 */
export function useTeamTasks() {
	const { user } = useAuthenticateUser();
	/** Change active task */
	const { setActiveTask, isPending: isUpdatingActiveTask } = useSetActiveTask();

	const setAllTasks = useSetAtom(teamTasksState);
	const tasks = useSortedTasksByCreation();
	const {
		detailedTaskQuery: { data: detailedTask },
		setDetailedTaskId
	} = useDetailedTask();
	const tasksRef = useSyncRef(tasks);
	const { data: userData } = useUserQuery();
	const authUser = useSyncRef(userData);
	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const taskStatuses = useAtomValue(taskStatusesState);
	const activeTeam = useCurrentTeam();
	const activeTeamRef = useSyncRef(activeTeam);
	const [, setSelectedEmployeeId] = useState(user?.employee?.id);
	const [, setSelectedOrganizationTeamId] = useState(activeTeam?.id);
	const { task: activeTeamTask } = useCurrentActiveTask();

	// Track expected task ID to prevent stale server data from overwriting local selection.
	// When user selects a task, we store its ID here. The sync effect will skip updates
	// until server data matches this expected ID (confirming our selection was persisted).
	const expectedActiveTaskIdRef = useRef<string | null>(null);
	const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();

	/**
	 * React Query for team tasks
	 * Keep for backward compatibility
	 * @deprecated use `useCurrentTeamTasksQuery()` hook, that is in sync with tanstack
	 */
	const teamTasksQuery = useCurrentTeamTasksQuery();

	const { getTaskById: getTaskByIdQuery, isPending: getTasksByIdLoading } = useGetTaskByIdQueryLazy();

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useGetTasksByEmployeeIdQueryLazy()` hook, that is in sync with tanstack
	 */
	const { getTasksByEmployeeIdQuery, isLoading: getTasksByEmployeeIdLoading } = useGetTasksByEmployeeIdQueryLazy();

	// Mutations
	const createTaskMutation = useCreateTaskMutation();

	const updateTaskMutation = useUpdateTaskMutation();

	const deleteTaskMutation = useDeleteTaskMutation();

	const deleteEmployeeFromTasksMutation = useDeleteEmployeeFromTasksMutation();

	/**
	 * Deep update function
	 * Keep for backward compatibility
	 * @deprecated use `useCurrentTeamTasksQuery()` hooks that is in sync with tanstack !
	 *
	 * @example
	 * const { data: tasks } = useCurrentTeamTasksQuery();
	 */
	const deepCheckAndUpdateTasks = useCallback(
		(responseTasks: TTask[], deepCheck?: boolean) => {
			if (responseTasks && responseTasks.length) {
				responseTasks.forEach((task) => {
					if (task.tags && task.tags?.length) {
						task.label = task.tags[0].name;
					}
				});
			}

			/**
			 * When deepCheck enabled,
			 * then update the tasks store only when active-team tasks have an update
			 */
			if (deepCheck) {
				const latestActiveTeamTasks = responseTasks
					.filter((task) => {
						return task.teams?.some((tm) => {
							return tm.id === activeTeamRef.current?.id;
						});
					})
					.sort((a, b) => a.title.localeCompare(b.title));

				const activeTeamTasks = tasksRef.current.slice().sort((a, b) => a.title.localeCompare(b.title));

				if (!isEqual(latestActiveTeamTasks, activeTeamTasks)) {
					setAllTasks(responseTasks);
				}
			} else {
				setAllTasks(responseTasks);
			}
		},
		[activeTeamRef, setAllTasks, tasksRef]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useGetTaskByIdQueryLazy()` hooks that is in sync with tanstack !
	 *
	 * @example
	 * const { getTaskById } = useGetTaskByIdQueryLazy();
	 */
	const getTaskById = useCallback(
		async (taskId: string) => {
			tasksRef.current.forEach((task) => {
				if (task.id === taskId) {
					setDetailedTaskId(task?.id);
				}
			});

			try {
				const res = await getTaskByIdQuery(taskId);
				setDetailedTaskId(res?.id || null);
				return res;
			} catch (error) {
				console.error('Error fetching task by ID:', error);
				return null;
			}
		},
		[setDetailedTaskId, tasksRef]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useGetTasksByEmployeeIdQueryLazy()` hook, that is in sync with tanstack
	 */
	const getTasksByEmployeeId = useCallback(
		async (employeeId: string, organizationTeamId: string) => {
			try {
				if (!employeeId || !organizationTeamId) {
					throw new Error('Required parameters missing : employeeId or organizationTeamId');
				}

				setSelectedEmployeeId(employeeId);
				setSelectedOrganizationTeamId(organizationTeamId);

				const res = await getTasksByEmployeeIdQuery(employeeId);
				return res;
			} catch (error) {
				console.error('Error fetching tasks by employee ID:', error);
				return [];
			}
		},
		[getTasksByEmployeeIdQuery]
	);

	const loadTeamTasksData = useCallback(
		async (deepCheck?: boolean) => {
			if (teamTasksQuery.isLoading || !user || !activeTeamRef.current?.id) {
				return Promise.resolve(true);
			}

			try {
				const res = await teamTasksQuery.refetch();
				if (res.data?.items) {
					deepCheckAndUpdateTasks(res.data.items, deepCheck);
				}
				return res;
			} catch (error) {
				console.error('Error loading team tasks data:', error);
				return null;
			}
		},
		[teamTasksQuery, deepCheckAndUpdateTasks, user, activeTeamRef]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useDeleteTaskMutation()` hooks that is in sync with tanstack !
	 */
	const deleteTask = useCallback(
		async (task: (typeof tasks)[0]) => {
			try {
				return await deleteTaskMutation.mutateAsync(task.id);
			} catch (error) {
				console.error('Error deleting task:', error);
				throw error;
			}
		},
		[deleteTaskMutation, setAllTasks]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useCreateTaskMutation()` hooks that is in sync with tanstack !
	 */
	const createTask = useCallback(
		async ({
			title,
			issueType,
			taskStatusId,
			status = taskStatuses[0]?.name,
			priority,
			size,
			tags,
			description,
			projectId,
			members
		}: {
			title: string;
			issueType?: EIssueType | null;
			status?: ETaskStatusName | null;
			taskStatusId: string;
			priority?: ETaskPriority | null;
			size?: ETaskSize | null;
			tags?: TTag[] | null;
			description?: string | null;
			projectId?: string | null;
			members?: TEmployee[] | { id: string }[] | null;
		}) => {
			try {
				const res = await createTaskMutation.mutateAsync({
					title,
					issueType,
					status,
					priority,
					size,
					tags,
					// Set Project Id to cookie
					// TODO: Make it dynamic when we add Dropdown in Navbar
					projectId,
					...(description ? { description: `<p>${description}</p>` } : {}),
					members: members ?? [],
					taskStatusId: taskStatusId
				});
				return res;
			} catch (error) {
				console.error('Error creating task:', error);
				throw error;
			}
		},
		[createTaskMutation, deepCheckAndUpdateTasks, taskStatuses]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useUpdateTaskMutation()` hooks that is in sync with tanstack !
	 */
	const updateTask = useCallback(
		async (task: Partial<TTask> & { id: string }) => {
			try {
				const res = await updateTaskMutation.mutateAsync({
					taskId: task.id,
					taskData: task
				});
				setActiveTask(res);

				if (detailedTask) {
					await getTaskById(task.id);
				}

				return res;
			} catch (error) {
				console.error('Error updating task:', error);
				throw error;
			}
		},
		[updateTaskMutation, setActiveTask, deepCheckAndUpdateTasks, detailedTask, getTaskById]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useUpdateTaskMutation()` or `useDetailedTask()` hooks that is in sync with tanstack !
	 */
	const updateTitle = useCallback(
		async ({
			newTitle,
			task,
			loader,
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
				if (isDetailedTask) setDetailedTaskId(res?.id);

				return res;
			}
			return Promise.resolve();
		},
		[updateTask, setDetailedTaskId]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useUpdateTaskMutation()` or `useDetailedTask()` hooks that is in sync with tanstack !
	 *
	 */
	const updateDescription = useCallback(
		async ({
			newDescription,
			task,
			loader,
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
					setDetailedTaskId(res?.id);
				}
				return res;
			}
			return Promise.resolve();
		},
		[updateTask, setDetailedTaskId]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useUpdateTaskMutation()` or `useDetailedTask()` hooks that is in sync with tanstack !
	 */
	const updatePublicity = useCallback(
		async ({
			publicity,
			task,
			loader,
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
					setDetailedTaskId(task?.id);
				}
				return res;
			}
			return Promise.resolve();
		},
		[updateTask, setDetailedTaskId]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useHandleStatusUpdate()` hooks that is in sync with tanstack !
	 */
	const { handleStatusUpdate } = useHandleStatusUpdate();

	/**
	 * Keep for backward compatibility
	 * @deprecated use `useDeleteEmployeeFromTasksMutation()` hooks that is in sync with tanstack !
	 */
	const deleteEmployeeFromTasks = useCallback(
		async (employeeId: string) => {
			try {
				await deleteEmployeeFromTasksMutation.mutateAsync(employeeId);
			} catch (error) {
				logErrorInDev('Error deleting employee from tasks:', error);
				throw error;
			}
		},
		[deleteEmployeeFromTasksMutation]
	);

	/**
	 * Keep for backward compatibility
	 * @deprecated use null with `useSetActiveTask()` hooks that is in sync with tanstack !
	 *
	 * @example
	 * const { setActiveTask } = useSetActiveTask();
	 * setActiveTask(null);
	 */
	const unassignAuthActiveTask = useCallback(() => {
		setActiveTask(null);
	}, [setActiveTask]);

	useConditionalUpdateEffect(
		() => {
			// Skip if we're currently updating the active task
			if (isUpdatingActiveTask) {
				return;
			}

			// If we have an expected task ID (user just selected a task locally):
			// - If server data matches → clear expectation, no need to update (already correct)
			// - If server data differs → skip update (server has stale data, wait for it to sync)
			if (expectedActiveTaskIdRef.current) {
				if (memberActiveTaskId === expectedActiveTaskIdRef.current) {
					// Server confirmed our selection
					expectedActiveTaskIdRef.current = null;
				}
				// Either way, skip - local state is already correct
				return;
			}

			// No local expectation - sync from server (multi-device sync or initial load)
			const memberActiveTask = tasks.find((item) => item.id === memberActiveTaskId);
			if (memberActiveTask) {
				setActiveTask(memberActiveTask);
			}
		},
		[activeTeam, tasks, memberActiveTaskId, isUpdatingActiveTask],
		Boolean(activeTeamTask)
	);

	// Reload tasks after active team changed
	useConditionalUpdateEffect(
		() => {
			if (activeTeam?.id && firstLoad) {
				loadTeamTasksData();
			}
		},
		[activeTeam?.id, firstLoad],
		true
	);

	// Get the active task from cookie and put on global store
	useConditionalUpdateEffect(
		() => {
			if (firstLoad) {
				const active_user_task = getActiveUserTaskCookie();
				const active_taskid =
					active_user_task?.userId === authUser.current?.id
						? active_user_task?.taskId
						: getActiveTaskIdCookie() || '';

				setActiveTask(tasks.find((ts) => ts.id === active_taskid) || null);
			}
		},
		[tasks, firstLoad, authUser],
		Boolean(activeTeamTask)
	);

	// Sync React Query data with Jotai state
	useConditionalUpdateEffect(
		() => {
			if (teamTasksQuery.data?.items) {
				deepCheckAndUpdateTasks(teamTasksQuery.data.items, true);
			}
		},
		[teamTasksQuery.data?.items],
		Boolean(tasks?.length)
	);

	return {
		tasks,
		loading: teamTasksQuery.isLoading,
		tasksFetching: updateTaskMutation.isPending,
		deleteTask,
		deleteLoading: deleteTaskMutation.isPending,
		createTask,
		createLoading: createTaskMutation.isPending,
		updateTask,
		updateLoading: updateTaskMutation.isPending,
		setActiveTask,
		activeTeamTask,
		firstLoadTasksData,
		updateTitle,
		updateDescription,
		updatePublicity,
		handleStatusUpdate,
		getTasksByEmployeeId,
		getTasksByEmployeeIdLoading,
		activeTeam,
		activeTeamId: activeTeam?.id,
		unassignAuthActiveTask,
		setAllTasks,
		loadTeamTasksData,
		deleteEmployeeFromTasks,
		deleteEmployeeFromTasksLoading: deleteEmployeeFromTasksMutation.isPending,
		getTaskById,
		getTasksByIdLoading,
		detailedTask,
		isUpdatingActiveTask // Export flag to protect against race conditions during task switching
	};
}
