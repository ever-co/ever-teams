'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
import { taskService } from '@/core/services/client/api';
import {
	activeTeamState,
	activeTeamTaskId,
	detailedTaskState,
	memberActiveTaskIdState,
	activeTeamTaskState,
	tasksByTeamState,
	teamTasksState,
	taskStatusesState
} from '@/core/stores';
import isEqual from 'lodash/isEqual';
import { useCallback, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useOrganizationEmployeeTeams } from './use-organization-teams-employee';
import { useAuthenticateUser } from '../../auth';
import { useFirstLoad, useConditionalUpdateEffect, useSyncRef, useQueryCall } from '../../common';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { TEmployee, TOrganizationTeamEmployee, TTag } from '@/core/types/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { useUserQuery } from '../../queries/user-user.query';

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
	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const { user, $user } = useAuthenticateUser();
	const queryClient = useQueryClient();

	const setAllTasks = useSetAtom(teamTasksState);
	const tasks = useAtomValue(tasksByTeamState);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
	const tasksRef = useSyncRef(tasks);
	const { data: userData } = useUserQuery();
	const authUser = useSyncRef(userData);
	const setActive = useSetAtom(activeTeamTaskId);
	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const $memberActiveTaskId = useSyncRef(memberActiveTaskId);
	const taskStatuses = useAtomValue(taskStatusesState);
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.employee?.id);
	const [selectedOrganizationTeamId, setSelectedOrganizationTeamId] = useState(activeTeam?.id);
	const [activeTeamTask, setActiveTeamTask] = useAtom(activeTeamTaskState);
	const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();

	// React Query for team tasks
	const teamTasksQuery = useQuery({
		queryKey: queryKeys.tasks.byTeam(activeTeam?.id),
		queryFn: async () => {
			if (!activeTeam?.id) {
				throw new Error('Required parameters missing');
			}
			const projectId = activeTeam?.projects && activeTeam?.projects.length > 0 ? activeTeam.projects[0].id : '';
			return await taskService.getTasks({ projectId });
		},
		enabled: !!activeTeam?.id,
		gcTime: 1000 * 60 * 60
	});

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

	const getTasksByEmployeeIdQuery = useQuery({
		queryKey: queryKeys.tasks.byEmployee(selectedEmployeeId, selectedOrganizationTeamId),
		queryFn: async () => {
			if (!activeTeam?.id) {
				throw new Error('Required parameters missing');
			}
			return await taskService.getTasksByEmployeeId({ employeeId: selectedEmployeeId! });
		},
		enabled: !!selectedEmployeeId && !!activeTeam?.id && !!selectedOrganizationTeamId,
		gcTime: 1000 * 60 * 60
	});

	// Mutations
	const createTaskMutation = useMutation({
		mutationFn: async (taskData: Parameters<typeof taskService.createTask>[0]) => {
			return await taskService.createTask(taskData);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

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
		}
	});

	const deleteTaskMutation = useMutation({
		mutationFn: async (taskId: string) => {
			return await taskService.deleteTask(taskId);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	const deleteEmployeeFromTasksMutation = useMutation({
		mutationFn: async (employeeId: string) => {
			return await taskService.deleteEmployeeFromTasks(employeeId);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
		}
	});

	// Invalidation function
	const invalidateTeamTasksData = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.tasks.byTeam(activeTeam?.id)
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.dailyPlans.myPlans(activeTeam?.id)
		});
		queryClient.invalidateQueries({
			queryKey: queryKeys.dailyPlans.allPlans(activeTeam?.id)
		});
	}, [activeTeam?.id, queryClient]);

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

	const setActiveUserTaskCookieCb = useCallback(
		(task: TTask | null) => {
			if (task?.id && authUser.current?.id) {
				setActiveUserTaskCookie({
					taskId: task?.id,
					userId: authUser.current?.id
				});
			} else {
				setActiveUserTaskCookie({
					taskId: '',
					userId: ''
				});
			}
		},
		[authUser]
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
			issueType?: string;
			status?: string;
			taskStatusId: string;
			priority?: string;
			size?: string;
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
					setDetailedTask(res);
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
	 * Change active taskT
	 */
	const setActiveTask = useCallback(
		(task: TTask | null) => {
			/**
			 * Unassign previous active task
			 */
			if ($memberActiveTaskId.current && $user.current) {
				const _task = tasksRef.current.find((t) => t.id === $memberActiveTaskId.current);

				if (_task) {
					updateTask({
						..._task,
						members: _task.members?.filter((m) => m.id !== $user.current?.employee?.id)
					});
				}
			}

			setActiveTaskIdCookie(task?.id || '');
			setActiveTeamTask(task);
			setActiveUserTaskCookieCb(task);

			if (task) {
				// Update Current user's active task to sync across multiple devices
				const currentEmployeeDetails = activeTeam?.members?.find(
					(member: TOrganizationTeamEmployee) => member.employeeId === authUser.current?.employee?.id
				);

				if (currentEmployeeDetails && currentEmployeeDetails.employeeId) {
					updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.employeeId, {
						organizationId: task.organizationId,
						activeTaskId: task.id,
						organizationTeamId: activeTeam?.id,
						tenantId: activeTeam?.tenantId ?? ''
					});
				}
			}
		},
		[
			setActiveTeamTask,
			setActiveUserTaskCookieCb,
			updateOrganizationTeamEmployeeActiveTask,
			activeTeam,
			authUser,
			$memberActiveTaskId,
			$user,
			tasksRef,
			updateTask
		]
	);

	const deleteEmployeeFromTasks = useCallback(
		async (employeeId: string) => {
			try {
				await deleteEmployeeFromTasksMutation.mutateAsync(employeeId);
			} catch (error) {
				console.error('Error deleting employee from tasks:', error);
				throw error;
			}
		},
		[deleteEmployeeFromTasksMutation]
	);

	const unassignAuthActiveTask = useCallback(() => {
		setActiveTaskIdCookie('');
		setActiveTeamTask(null);
	}, [setActiveTeamTask]);

	useConditionalUpdateEffect(
		() => {
			const memberActiveTask = tasks.find((item) => item.id === memberActiveTaskId);
			if (memberActiveTask) {
				setActiveTeamTask(memberActiveTask);
			}
		},
		[activeTeam, tasks, memberActiveTaskId],
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

				setActiveTeamTask(tasks.find((ts) => ts.id === active_taskid) || null);
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
		detailedTask
	};
}
