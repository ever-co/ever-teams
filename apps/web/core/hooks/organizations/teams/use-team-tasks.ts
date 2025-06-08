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
import { useFirstLoad, useQueryCall, useSyncRef } from '../../common';
import { useTaskStatus } from '../../tasks';
import { ITask } from '@/core/types/interfaces/task/task';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

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

	// Queries hooks
	const { queryCall, loading, loadingRef } = useQueryCall(taskService.getTasks);
	const { queryCall: getTasksByIdQueryCall, loading: getTasksByIdLoading } = useQueryCall(taskService.getTaskById);
	const { queryCall: getTasksByEmployeeIdQueryCall, loading: getTasksByEmployeeIdLoading } = useQueryCall(
		taskService.getTasksByEmployeeId
	);

	const { queryCall: deleteQueryCall, loading: deleteLoading } = useQueryCall(taskService.deleteTask);

	const { queryCall: createQueryCall, loading: createLoading } = useQueryCall(taskService.createTask);

	const { queryCall: updateQueryCall, loading: updateLoading } = useQueryCall(taskService.updateTask);

	const { queryCall: getAllQueryCall } = useQueryCall(dailyPlanService.getAllDayPlans);
	const { queryCall: getMyDailyPlansQueryCall } = useQueryCall(dailyPlanService.getMyDailyPlans);

	const { queryCall: deleteEmployeeFromTasksQueryCall, loading: deleteEmployeeFromTasksLoading } = useQueryCall(
		taskService.deleteEmployeeFromTasks
	);

	const getAllDayPlans = useCallback(async () => {
		try {
			const response = await getAllQueryCall();

			if (response?.data?.items?.length) {
				const { items, total } = response.data;
				setDailyPlan({ items, total });
			}
		} catch (error) {
			console.error('Error fetching all day plans:', error);
		}
	}, [getAllQueryCall, setDailyPlan]);

	const getMyDailyPlans = useCallback(async () => {
		try {
			const response = await getMyDailyPlansQueryCall();

			if (response?.data?.items?.length) {
				const { items, total } = response.data;
				setMyDailyPlans({ items, total });
			}
		} catch (error) {
			console.error('Error fetching my daily plans:', error);
		}
	}, [getMyDailyPlansQueryCall, setMyDailyPlans]);

	const getTaskById = useCallback(
		(taskId: string) => {
			tasksRef.current.forEach((task) => {
				if (task.id === taskId) {
					setDetailedTask(task);
				}
			});

			return getTasksByIdQueryCall(taskId).then((res) => {
				setDetailedTask(res?.data || null);
				return res;
			});
		},
		[getTasksByIdQueryCall, setDetailedTask, tasksRef]
	);

	const getTasksByEmployeeId = useCallback(
		(employeeId: string, organizationTeamId: string) => {
			return getTasksByEmployeeIdQueryCall(employeeId, organizationTeamId).then((res) => {
				// setEmployeeState(res?.data || []);
				return res.data;
			});
		},
		[getTasksByEmployeeIdQueryCall]
	);

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
		(deepCheck?: boolean) => {
			if (loadingRef.current || !user || !activeTeamRef.current?.id) {
				return new Promise((response) => {
					response(true);
				});
			}

			return queryCall(
				user?.employee?.organizationId ?? '',
				user?.employee?.tenantId ?? '',
				activeTeamRef.current?.projects && activeTeamRef.current?.projects.length
					? activeTeamRef.current?.projects[0].id
					: '',
				activeTeamRef.current?.id || ''
			).then((res) => {
				deepCheckAndUpdateTasks(res?.data?.items || [], deepCheck);
				return res;
			});
		},
		[queryCall, deepCheckAndUpdateTasks, loadingRef, user, activeTeamRef]
	);

	// Global loading state
	useEffect(() => {
		if (firstLoad) {
			setTasksFetching(loading);
		}
	}, [loading, firstLoad]);

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

	// Queries calls
	const deleteTask = useCallback(
		(task: (typeof tasks)[0]) => {
			return deleteQueryCall(task.id).then((res) => {
				const affected = res.data?.affected || 0;
				if (affected > 0) {
					setAllTasks((ts) => {
						return ts.filter((t) => t.id !== task.id);
					});
				}
				return res;
			});
		},
		[deleteQueryCall, setAllTasks]
	);

	const createTask = useCallback(
		({
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
			return createQueryCall({
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
			}).then((res) => {
				deepCheckAndUpdateTasks(res?.data?.items || [], true);
				return res;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[createQueryCall, deepCheckAndUpdateTasks, activeTeam]
	);

	const updateTask = useCallback(
		(task: Partial<ITask> & { id: string }) => {
			return updateQueryCall(task.id, task).then((res) => {
				setActive({
					id: ''
				});
				const updatedTasks = res?.data?.items || [];
				deepCheckAndUpdateTasks(updatedTasks, true);

				if (detailedTask) {
					getTaskById(detailedTask.id);
				}

				return res;
			});
		},
		[updateQueryCall, setActive, deepCheckAndUpdateTasks, detailedTask, getTaskById]
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
						tenantId: activeTeam?.tenantId
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
		(employeeId: string, organizationTeamId: string) => {
			deleteEmployeeFromTasksQueryCall(employeeId, organizationTeamId);
		},
		[deleteEmployeeFromTasksQueryCall]
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
		loading,
		tasksFetching,
		deleteTask,
		deleteLoading,
		createTask,
		createLoading,
		updateTask,
		updateLoading,
		setActiveTask,
		activeTeamTask,
		firstLoadTasksData,
		updateTitle,
		updateDescription,
		updatePublicity,
		handleStatusUpdate,
		// employeeState,
		getTasksByEmployeeId,
		getTasksByEmployeeIdLoading,
		activeTeam,
		activeTeamId: activeTeam?.id,
		unassignAuthActiveTask,
		setAllTasks,
		loadTeamTasksData,
		deleteEmployeeFromTasks,
		deleteEmployeeFromTasksLoading,
		getTaskById,
		getTasksByIdLoading,
		detailedTask
	};
}
