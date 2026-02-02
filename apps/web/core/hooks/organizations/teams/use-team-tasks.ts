'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	activeTeamState,
	activeTeamTaskId,
	detailedTaskState,
	activeTeamTaskState,
	teamTasksState,
	taskStatusesState
} from '@/core/stores';
import isEqual from 'lodash/isEqual';
import { useCallback, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useAuthenticateUser } from '../../auth';
import { useFirstLoad, useConditionalUpdateEffect, useSyncRef } from '../../common';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { ETaskStatusName, TEmployee, TTag } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../../queries/user-user.query';
import { EIssueType, ETaskPriority, ETaskSize } from '@/core/types/generics/enums/task';
import {
	useCreateTaskMutation,
	useDeleteEmployeeFromTaskMutation,
	useDeleteTaskMutation,
	useGetCurrentTeamTasksQuery,
	useGetTaskByEmployeeQuery,
	useGetTaskByIdLazyQuery,
	useSortedTasks,
	useUpdateTaskMutation
} from '../../tasks';
import { useSetActiveTask } from '../../tasks/utils/use-set-active-task';

/**
 * A React hook that provides functionality for managing team tasks, including creating, updating, deleting, and fetching tasks.
 *
 * @returns {Object} An object containing various functions and state related to team tasks.
 * @property {TTask[]} tasks - The list of team tasks.
 * @property {boolean} loading - Indicates whether the tasks are currently being loaded.
 * @property {boolean} tasksFetching - Indicates whether the tasks are currently being fetched.
 * @property {(task: TTask) => Promise<any>} deleteTask - A function to delete a task.
 * @property {boolean} deleteLoading - Indicates whether a task is currently being deleted.
 * @property {(taskData: { taskName: string; issueType?: string; status?: string; taskStatusId: string; priority?: string; size?: string; tags?: ITaskLabelsItemList[]; description?: string | null; }, members?: { id: string }[]) => Promise<any>} createTask - A function to create a new task.
 * @property {boolean} createLoading - Indicates whether a task is currently being created.
 * @property {(task: Partial<TTask> & { id: string }) => Promise<any>} updateTask - A function to update an existing task.
 * @property {boolean} updateLoading - Indicates whether a task is currently being updated.
 * @property {(task: TTask | null) => void} setActiveTask - A function to set the active task.
 * @property {TTask | null} activeTeamTask - The currently active team task.
 * @property {any} firstLoadTasksData - Data related to the first load of tasks.
 * @property {(newTitle: string, task?: TTask | null, loader?: boolean) => Promise<any>} updateTitle - A function to update the title of a task.
 * @property {(newDescription: string, task?: TTask | null, loader?: boolean) => Promise<any>} updateDescription - A function to update the description of a task.
 * @property {(publicity: boolean, task?: TTask | null, loader?: boolean) => Promise<any>} updatePublicity - A function to update the publicity of a task.
 * @property {<T extends ITaskStatusField>(status: ITaskStatusStack[T], field: T, taskStatusId: TTask['taskStatusId'], task?: TTask | null, loader?: boolean) => Promise<any>} handleStatusUpdate - A function to update the status of a task.
 * @property {(employeeId: string, organizationTeamId: string) => void} getTasksByEmployeeId - A function to fetch tasks by employee ID.
 * @property {boolean} getTasksByEmployeeIdLoading - Indicates whether tasks are currently being fetched by employee ID.
 * @property {TTask['organizationId']} activeTeamId - The ID of the active team.
 * @property {() => void} unassignAuthActiveTask - A function to unassign the active task of the authenticated user.
 * @property {(tasks: TTask[]) => void} setAllTasks - A function to set all the tasks.
 * @property {(deepCheck?: boolean) => Promise<any>} loadTeamTasksData - A function to load the team tasks data.
 * @property {(employeeId: string, organizationTeamId: string) => void} deleteEmployeeFromTasks - A function to delete an employee from tasks.
 * @property {boolean} deleteEmployeeFromTasksLoading - Indicates whether an employee is currently being deleted from tasks.
 * @property {(taskId: string) => Promise<any>} getTaskById - A function to fetch a task by its ID.
 * @property {boolean} getTasksByIdLoading - Indicates whether a task is currently being fetched by its ID.
 * @property {TTask | null} detailedTask - The detailed task.
 */

export function useTeamTasks() {
	const { user } = useAuthenticateUser();

	const setAllTasks = useSetAtom(teamTasksState);
	const tasks = useSortedTasks();
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
	const tasksRef = useSyncRef(tasks);
	const { data: userData } = useUserQuery();
	const authUser = useSyncRef(userData);
	const setActive = useSetAtom(activeTeamTaskId);
	const taskStatuses = useAtomValue(taskStatusesState);
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.employee?.id);
	const [, setSelectedOrganizationTeamId] = useState(activeTeam?.id);
	const [activeTeamTask, setActiveTeamTask] = useAtom(activeTeamTaskState);

	const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();

	// React Query for team tasks
	const teamTasksQuery = useGetCurrentTeamTasksQuery();

	const { getTaskById: getTaskByIdQuery, isPending: getTasksByIdLoading } = useGetTaskByIdLazyQuery();

	const getTasksByEmployeeIdQuery = useGetTaskByEmployeeQuery(selectedEmployeeId);

	// Mutations
	const createTaskMutation = useCreateTaskMutation();

	const updateTaskMutation = useUpdateTaskMutation();

	const deleteTaskMutation = useDeleteTaskMutation();

	const deleteEmployeeFromTasksMutation = useDeleteEmployeeFromTaskMutation();

	// Deep update function
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

	const getTaskById = useCallback(
		async (taskId: string) => {
			tasksRef.current.forEach((task) => {
				if (task.id === taskId) {
					setDetailedTask(task);
				}
			});

			try {
				const res = await getTaskByIdQuery(taskId);
				setDetailedTask(res || null);
				return res;
			} catch (error) {
				console.error('Error fetching task by ID:', error);
				return null;
			}
		},
		[setDetailedTask, tasksRef]
	);

	const getTasksByEmployeeId = useCallback(
		async (employeeId: string, organizationTeamId: string) => {
			try {
				if (!employeeId || !organizationTeamId) {
					throw new Error('Required parameters missing : employeeId or organizationTeamId');
				}

				setSelectedEmployeeId(employeeId);
				setSelectedOrganizationTeamId(organizationTeamId);

				const res = await getTasksByEmployeeIdQuery.refetch();
				return res.data;
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

				if (detailedTask) {
					await getTaskById(task.id);
				}

				return res;
			} catch (error) {
				console.error('Error updating task:', error);
				throw error;
			}
		},
		[updateTaskMutation, setActive, deepCheckAndUpdateTasks, detailedTask, getTaskById]
	);

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
				if (isDetailedTask) {
					setDetailedTask(res);
				}
				return res;
			}
			return Promise.resolve();
		},
		[updateTask, setDetailedTask]
	);

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
					setDetailedTask(res);
				}
				return res;
			}
			return Promise.resolve();
		},
		[updateTask, setDetailedTask]
	);

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
					setDetailedTask({
						...detailedTask,
						public: res.public
					} as TTask);
				}
				return res;
			}
			return Promise.resolve();
		},
		[updateTask, setDetailedTask]
	);

	const handleStatusUpdate = useCallback(
		<T extends ITaskStatusField>(
			status: ITaskStatusStack[T],
			field: T,
			taskStatusId: TTask['taskStatusId'],
			task?: TTask | null,
			loader?: boolean
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
					const active_task_id = getActiveTaskIdCookie();
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

	/**
	 * Change active task
	 */
	const { setActiveTask, isUpdatingActiveTask } = useSetActiveTask();

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

	const unassignAuthActiveTask = useCallback(() => {
		setActiveTaskIdCookie('');
		setActiveTeamTask(null);
	}, [setActiveTeamTask]);

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

				setActiveTeamTask(tasks.find((ts) => ts.id === active_taskid) || null);
			}
		},
		[tasks, firstLoad, authUser],
		Boolean(activeTeamTask)
	);

	// Sync React Query data with Jotai state

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
		getTasksByEmployeeIdLoading: getTasksByEmployeeIdQuery.isLoading,
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
