'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
import { dailyPlanService, taskService } from '@/core/services/client/api';
import {
	activeTeamState,
	activeTeamTaskId,
	dailyPlanListState,
	detailedTaskState,
	// employeeTasksState,
	memberActiveTaskIdState,
	myDailyPlanListState,
	userState,
	activeTeamTaskState,
	tasksByTeamState,
	tasksFetchingState,
	teamTasksState
} from '@/core/stores';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useOrganizationEmployeeTeams } from './use-organization-teams-employee';
import { useAuthenticateUser } from '../../auth';
import { useFirstLoad, useConditionalUpdateEffect, useSyncRef } from '../../common';
import { useTaskStatus } from '../../tasks';
import { ITask } from '@/core/types/interfaces/task/task';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { TOrganizationTeamEmployee, TTag } from '@/core/types/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * A React hook that provides functionality for managing team tasks, including creating, updating, deleting, and fetching tasks.
 *
 * @returns {Object} An object containing various functions and state related to team tasks.
 * @property {ITask[]} tasks - The list of team tasks.
 * @property {boolean} loading - Indicates whether the tasks are currently being loaded.
 * @property {boolean} tasksFetching - Indicates whether the tasks are currently being fetched.
 * @property {(task: ITask) => Promise<any>} deleteTask - A function to delete a task.
 * @property {boolean} deleteLoading - Indicates whether a task is currently being deleted.
 * @property {(taskData: { taskName: string; issueType?: string; status?: string; taskStatusId: string; priority?: string; size?: string; tags?: ITaskLabelsItemList[]; description?: string | null; }, members?: { id: string }[]) => Promise<any>} createTask - A function to create a new task.
 * @property {boolean} createLoading - Indicates whether a task is currently being created.
 * @property {(task: Partial<ITask> & { id: string }) => Promise<any>} updateTask - A function to update an existing task.
 * @property {boolean} updateLoading - Indicates whether a task is currently being updated.
 * @property {(task: ITask | null) => void} setActiveTask - A function to set the active task.
 * @property {ITask | null} activeTeamTask - The currently active team task.
 * @property {any} firstLoadTasksData - Data related to the first load of tasks.
 * @property {(newTitle: string, task?: ITask | null, loader?: boolean) => Promise<any>} updateTitle - A function to update the title of a task.
 * @property {(newDescription: string, task?: ITask | null, loader?: boolean) => Promise<any>} updateDescription - A function to update the description of a task.
 * @property {(publicity: boolean, task?: ITask | null, loader?: boolean) => Promise<any>} updatePublicity - A function to update the publicity of a task.
 * @property {<T extends ITaskStatusField>(status: ITaskStatusStack[T], field: T, taskStatusId: ITask['taskStatusId'], task?: ITask | null, loader?: boolean) => Promise<any>} handleStatusUpdate - A function to update the status of a task.
 * @property {(employeeId: string, organizationTeamId: string) => void} getTasksByEmployeeId - A function to fetch tasks by employee ID.
 * @property {boolean} getTasksByEmployeeIdLoading - Indicates whether tasks are currently being fetched by employee ID.
 * @property {ITask['organizationId']} activeTeamId - The ID of the active team.
 * @property {() => void} unassignAuthActiveTask - A function to unassign the active task of the authenticated user.
 * @property {(tasks: ITask[]) => void} setAllTasks - A function to set all the tasks.
 * @property {(deepCheck?: boolean) => Promise<any>} loadTeamTasksData - A function to load the team tasks data.
 * @property {(employeeId: string, organizationTeamId: string) => void} deleteEmployeeFromTasks - A function to delete an employee from tasks.
 * @property {boolean} deleteEmployeeFromTasksLoading - Indicates whether an employee is currently being deleted from tasks.
 * @property {(taskId: string) => Promise<any>} getTaskById - A function to fetch a task by its ID.
 * @property {boolean} getTasksByIdLoading - Indicates whether a task is currently being fetched by its ID.
 * @property {ITask | null} detailedTask - The detailed task.
 */

export function useTeamTasks() {
	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const { user, $user } = useAuthenticateUser();
	const queryClient = useQueryClient();

	const setAllTasks = useSetAtom(teamTasksState);
	const tasks = useAtomValue(tasksByTeamState);
	const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
	// const allTaskStatistics = useAtomValue(allTaskStatisticsState);
	const tasksRef = useSyncRef(tasks);

	const [tasksFetching, setTasksFetching] = useAtom(tasksFetchingState);
	const authUser = useSyncRef(useAtomValue(userState));
	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const $memberActiveTaskId = useSyncRef(memberActiveTaskId);
	// const [employeeState, setEmployeeState] = useAtom(employeeTasksState);
	const { taskStatuses } = useTaskStatus();
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);

	const [activeTeamTask, setActiveTeamTask] = useAtom(activeTeamTaskState);

	const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();

	const setDailyPlan = useSetAtom(dailyPlanListState);
	const setMyDailyPlans = useSetAtom(myDailyPlanListState);

	// React Query for team tasks
	const teamTasksQuery = useQuery({
		queryKey: queryKeys.tasks.byTeam(activeTeam?.id),
		queryFn: async () => {
			if (!user?.employee?.organizationId || !user?.employee?.tenantId || !activeTeam?.id) {
				throw new Error('Required parameters missing');
			}
			const projectId = activeTeam?.projects && activeTeam?.projects.length > 0 ? activeTeam.projects[0].id : '';
			return await taskService.getTasks(
				user.employee.organizationId,
				user.employee.tenantId,
				projectId,
				activeTeam.id
			);
		},
		enabled: !!user?.employee?.organizationId && !!user?.employee?.tenantId && !!activeTeam?.id,
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
		mutationFn: async ({ taskId, taskData }: { taskId: string; taskData: Partial<ITask> }) => {
			return await taskService.updateTask(taskId, taskData);
		},
		onSuccess: () => {
			invalidateTeamTasksData();
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
		mutationFn: async ({ employeeId, organizationTeamId }: { employeeId: string; organizationTeamId: string }) => {
			return await taskService.deleteEmployeeFromTasks(employeeId, organizationTeamId);
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
		// queryClient.invalidateQueries({
		// 	queryKey: queryKeys.dailyPlans.myPlans(activeTeam?.id)
		// });
		// queryClient.invalidateQueries({
		// 	queryKey: queryKeys.dailyPlans.allPlans(activeTeam?.id)
		// });
	}, [activeTeam?.id, queryClient]);

	// Sync React Query data with Jotai state
	useConditionalUpdateEffect(
		() => {
			if (teamTasksQuery.data?.data?.items) {
				deepCheckAndUpdateTasks(teamTasksQuery.data.data.items, true);
			}
		},
		[teamTasksQuery.data?.data?.items],
		Boolean(tasks?.length)
	);

	const getAllDayPlans = useCallback(async () => {
		try {
			const response = await dailyPlanService.getAllDayPlans(activeTeam?.id);

			if (response?.data?.items?.length) {
				const { items, total } = response.data;
				setDailyPlan({ items, total });
			}
		} catch (error) {
			console.error('Error fetching all day plans:', error);
		}
	}, [activeTeam?.id, setDailyPlan]);

	const getMyDailyPlans = useCallback(async () => {
		try {
			const response = await dailyPlanService.getMyDailyPlans(activeTeam?.id);

			if (response?.data?.items?.length) {
				const { items, total } = response.data;
				setMyDailyPlans({ items, total });
			}
		} catch (error) {
			console.error('Error fetching my daily plans:', error);
		}
	}, [activeTeam?.id, setMyDailyPlans]);

	const getTaskById = useCallback(
		async (taskId: string) => {
			tasksRef.current.forEach((task) => {
				if (task.id === taskId) {
					setDetailedTask(task);
				}
			});

			try {
				const res = await taskService.getTaskById(taskId);
				setDetailedTask(res?.data || null);
				return res;
			} catch (error) {
				console.error('Error fetching task by ID:', error);
				return null;
			}
		},
		[setDetailedTask, tasksRef]
	);

	const getTasksByEmployeeId = useCallback(async (employeeId: string, organizationTeamId: string) => {
		try {
			const res = await taskService.getTasksByEmployeeId(employeeId, organizationTeamId);
			// setEmployeeState(res?.data || []);
			return res.data;
		} catch (error) {
			console.error('Error fetching tasks by employee ID:', error);
			return [];
		}
	}, []);

	const deepCheckAndUpdateTasks = useCallback(
		(responseTasks: ITask[], deepCheck?: boolean) => {
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
					// Fetch plans with updated task(s)
					getMyDailyPlans();
					getAllDayPlans();
					setAllTasks(responseTasks);
				}
			} else {
				setAllTasks(responseTasks);
			}
		},
		[activeTeamRef, getAllDayPlans, getMyDailyPlans, setAllTasks, tasksRef]
	);

	const loadTeamTasksData = useCallback(
		async (deepCheck?: boolean) => {
			if (teamTasksQuery.isLoading || !user || !activeTeamRef.current?.id) {
				return Promise.resolve(true);
			}

			try {
				const res = await teamTasksQuery.refetch();
				if (res.data?.data?.items) {
					deepCheckAndUpdateTasks(res.data.data.items, deepCheck);
				}
				return res;
			} catch (error) {
				console.error('Error loading team tasks data:', error);
				return null;
			}
		},
		[teamTasksQuery, deepCheckAndUpdateTasks, user, activeTeamRef]
	);

	// Global loading state
	useEffect(() => {
		if (firstLoad) {
			setTasksFetching(teamTasksQuery.isLoading);
		}
	}, [teamTasksQuery.isLoading, firstLoad, setTasksFetching]);

	const setActiveUserTaskCookieCb = useCallback(
		(task: ITask | null) => {
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

	// Reload tasks after active team changed
	useEffect(() => {
		if (activeTeam?.id && firstLoad) {
			loadTeamTasksData();
		}
	}, [activeTeam?.id, firstLoad]);
	const setActive = useSetAtom(activeTeamTaskId);

	// Get the active task from cookie and put on global store
	useEffect(() => {
		if (firstLoad) {
			const active_user_task = getActiveUserTaskCookie();
			const active_taskid =
				active_user_task?.userId === authUser.current?.id
					? active_user_task?.taskId
					: getActiveTaskIdCookie() || '';

			setActiveTeamTask(tasks.find((ts) => ts.id === active_taskid) || null);
		}
	}, [tasks, firstLoad, authUser]);

	// CRUD operations using React Query mutations
	const deleteTask = useCallback(
		async (task: (typeof tasks)[0]) => {
			try {
				const res = await deleteTaskMutation.mutateAsync(task.id);
				const affected = res.data?.affected || 0;
				if (affected > 0) {
					setAllTasks((ts) => {
						return ts.filter((t) => t.id !== task.id);
					});
				}
				return res;
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
			tags?: TTag[];
			description?: string | null;
			projectId?: string | null;
			members?: { id: string }[];
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
					members,
					taskStatusId: taskStatusId
				});
				if (res?.data?.items) {
					deepCheckAndUpdateTasks(res.data.items, true);
				}
				return res;
			} catch (error) {
				console.error('Error creating task:', error);
				throw error;
			}
		},
		[createTaskMutation, deepCheckAndUpdateTasks, taskStatuses]
	);

	const updateTask = useCallback(
		async (task: Partial<ITask> & { id: string }) => {
			try {
				const res = await updateTaskMutation.mutateAsync({
					taskId: task.id,
					taskData: task
				});
				setActive({
					id: ''
				});
				const updatedTasks = res?.data?.items || [];
				deepCheckAndUpdateTasks(updatedTasks, true);

				if (detailedTask) {
					getTaskById(detailedTask.id);
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
		(newTitle: string, task?: ITask | null, loader?: boolean) => {
			if (task && newTitle !== task.title) {
				loader && setTasksFetching(true);
				return updateTask({
					...task,
					title: newTitle
				}).then((res) => {
					setTasksFetching(false);
					return res;
				});
			}
			return Promise.resolve();
		},
		[updateTask, setTasksFetching]
	);

	const updateDescription = useCallback(
		(newDescription: string, task?: ITask | null, loader?: boolean) => {
			if (task && newDescription !== task.description) {
				loader && setTasksFetching(true);
				return updateTask({
					...task,
					description: newDescription
				}).then((res) => {
					setTasksFetching(false);
					return res;
				});
			}
			return Promise.resolve();
		},
		[updateTask, setTasksFetching]
	);

	const updatePublicity = useCallback(
		(publicity: boolean, task?: ITask | null, loader?: boolean) => {
			if (task && publicity !== task.public) {
				loader && setTasksFetching(true);
				return updateTask({
					...task,
					public: publicity
				}).then((res) => {
					setTasksFetching(false);
					return res;
				});
			}
			return Promise.resolve();
		},
		[updateTask, setTasksFetching]
	);

	const handleStatusUpdate = useCallback(
		<T extends ITaskStatusField>(
			status: ITaskStatusStack[T],
			field: T,
			taskStatusId: ITask['taskStatusId'],
			task?: ITask | null,
			loader?: boolean
		) => {
			if (task && status !== (task as any)[field]) {
				loader && setTasksFetching(true);

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
				}).then((res) => {
					setTasksFetching(false);
					return res;
				});
			}

			return Promise.resolve();
		},
		[updateTask, setTasksFetching]
	);

	/**
	 * Change active task
	 */
	const setActiveTask = useCallback(
		(task: ITask | null) => {
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

				if (currentEmployeeDetails && currentEmployeeDetails.id) {
					updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.id, {
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
		async (employeeId: string, organizationTeamId: string) => {
			try {
				await deleteEmployeeFromTasksMutation.mutateAsync({ employeeId, organizationTeamId });
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

	useEffect(() => {
		const memberActiveTask = tasks.find((item) => item.id === memberActiveTaskId);
		if (memberActiveTask) {
			setActiveTeamTask(memberActiveTask);
		}
	}, [activeTeam, tasks, memberActiveTaskId]);

	return {
		tasks,
		loading: teamTasksQuery.isLoading,
		tasksFetching,
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
		// employeeState,
		getTasksByEmployeeId,
		getTasksByEmployeeIdLoading: false, // Since we're not using React Query for this
		activeTeam,
		activeTeamId: activeTeam?.id,
		unassignAuthActiveTask,
		setAllTasks,
		loadTeamTasksData,
		deleteEmployeeFromTasks,
		deleteEmployeeFromTasksLoading: deleteEmployeeFromTasksMutation.isPending,
		getTaskById,
		getTasksByIdLoading: false, // Since we're not using React Query for this
		detailedTask
	};
}
