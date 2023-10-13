import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@app/helpers';
import {
	ITaskLabelsItemList,
	ITaskStatusField,
	ITaskStatusStack,
	ITeamTask
} from '@app/interfaces';
import {
	createTeamTaskAPI,
	deleteTaskAPI,
	getTeamTasksAPI,
	updateTaskAPI,
	deleteEmployeeFromTasksAPI,
	getTasksByIdAPI
} from '@app/services/client/api';
import {
	activeTeamState,
	detailedTaskState,
	memberActiveTaskIdState,
	userState
} from '@app/stores';
import {
	activeTeamTaskState,
	tasksByTeamState,
	tasksFetchingState,
	teamTasksState
} from '@app/stores';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';
import { useOrganizationEmployeeTeams } from './useOrganizatioTeamsEmployee';

export function useTeamTasks() {
	const { updateOrganizationTeamEmployeeActiveTask } =
		useOrganizationEmployeeTeams();

	const setAllTasks = useSetRecoilState(teamTasksState);
	const tasks = useRecoilValue(tasksByTeamState);
	const [detailedTask, setDetailedTask] = useRecoilState(detailedTaskState);
	// const allTaskStatistics = useRecoilValue(allTaskStatisticsState);
	const tasksRef = useSyncRef(tasks);

	const [tasksFetching, setTasksFetching] = useRecoilState(tasksFetchingState);
	const authUser = useSyncRef(useRecoilValue(userState));
	const memberActiveTaskId = useRecoilValue(memberActiveTaskIdState);

	const activeTeam = useRecoilValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);

	const [activeTeamTask, setActiveTeamTask] =
		useRecoilState(activeTeamTaskState);

	const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();

	// Queries hooks
	const { queryCall, loading } = useQuery(getTeamTasksAPI);
	const { queryCall: getTasksByIdQueryCall, loading: getTasksByIdLoading } =
		useQuery(getTasksByIdAPI);

	const { queryCall: deleteQueryCall, loading: deleteLoading } =
		useQuery(deleteTaskAPI);

	const { queryCall: createQueryCall, loading: createLoading } =
		useQuery(createTeamTaskAPI);

	const { queryCall: updateQueryCall, loading: updateLoading } =
		useQuery(updateTaskAPI);

	const {
		queryCall: deleteEmployeeFromTasksQueryCall,
		loading: deleteEmployeeFromTasksLoading
	} = useQuery(deleteEmployeeFromTasksAPI);

	const getTaskById = useCallback(
		(taskId: string) => {
			return getTasksByIdQueryCall(taskId).then((res) => {
				setDetailedTask(res?.data?.data || null);
				return res;
			});
		},
		[getTasksByIdQueryCall, setDetailedTask]
	);

	const deepCheckAndUpdateTasks = useCallback(
		(responseTasks: ITeamTask[], deepCheck?: boolean) => {
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
						return task.teams.some((tm) => {
							return tm.id === activeTeamRef.current?.id;
						});
					})
					.sort((a, b) => a.title.localeCompare(b.title));

				const activeTeamTasks = tasksRef.current
					.slice()
					.sort((a, b) => a.title.localeCompare(b.title));

				if (!isEqual(latestActiveTeamTasks, activeTeamTasks)) {
					setAllTasks(responseTasks);
				}
			} else {
				setAllTasks(responseTasks);
			}
		},
		[activeTeamRef, setAllTasks, tasksRef]
	);

	const loadTeamTasksData = useCallback(
		(deepCheck?: boolean) => {
			return queryCall().then((res) => {
				deepCheckAndUpdateTasks(res?.data?.items || [], deepCheck);
				return res;
			});
		},
		[queryCall, deepCheckAndUpdateTasks]
	);

	// Global loading state
	useEffect(() => {
		if (firstLoad) {
			setTasksFetching(loading);
		}
	}, [loading, firstLoad, setTasksFetching]);

	const setActiveUserTaskCookieCb = useCallback(
		(task: ITeamTask | null) => {
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
	}, [activeTeam?.id, firstLoad, loadTeamTasksData]);

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
	}, [setActiveTeamTask, tasks, firstLoad, authUser]);

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
		(
			{
				taskName,
				issueType,
				status,
				priority,
				size,
				tags,
				description
			}: {
				taskName: string;
				issueType?: string;
				status?: string;
				priority?: string;
				size?: string;
				tags?: ITaskLabelsItemList[];
				description?: string | null;
			},
			members?: { id: string }[]
		) => {
			return createQueryCall({
				title: taskName,
				issueType,
				status,
				priority,
				size,
				tags,
				...(description ? { description: `<p>${description}</p>` } : {}),
				...(members ? { members } : {})
			}).then((res) => {
				deepCheckAndUpdateTasks(res?.data?.items || [], true);
				return res;
			});
		},
		[createQueryCall, deepCheckAndUpdateTasks]
	);

	const updateTask = useCallback(
		(task: Partial<ITeamTask> & { id: string }) => {
			return updateQueryCall(task.id, task).then((res) => {
				const updatedTasks = res?.data?.items || [];
				deepCheckAndUpdateTasks(updatedTasks, true);

				if (detailedTask) {
					getTaskById(detailedTask.id);
				}

				return res;
			});
		},
		[updateQueryCall, deepCheckAndUpdateTasks, detailedTask, getTaskById]
	);

	const updateTitle = useCallback(
		(newTitle: string, task?: ITeamTask | null, loader?: boolean) => {
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
		(newDescription: string, task?: ITeamTask | null, loader?: boolean) => {
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
		(publicity: boolean, task?: ITeamTask | null, loader?: boolean) => {
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
			task?: ITeamTask | null,
			loader?: boolean
		) => {
			if (task && status !== task[field]) {
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
		(task: ITeamTask | null) => {
			setActiveTaskIdCookie(task?.id || '');
			setActiveTeamTask(task);
			setActiveUserTaskCookieCb(task);

			if (task) {
				// Update Current user's active task to sync across multiple devices
				const currentEmployeeDetails = activeTeam?.members.find(
					(member) => member.employeeId === authUser.current?.employee?.id
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
			authUser
		]
	);

	const deleteEmployeeFromTasks = useCallback(
		(employeeId: string, organizationTeamId: string) => {
			deleteEmployeeFromTasksQueryCall(employeeId, organizationTeamId);
		},
		[deleteEmployeeFromTasksQueryCall]
	);

	useEffect(() => {
		const memberActiveTask = tasks.find(
			(item) => item.id === memberActiveTaskId
		);
		if (memberActiveTask) {
			setActiveTeamTask(memberActiveTask);
		}
	}, [activeTeam, tasks, memberActiveTaskId, setActiveTeamTask]);

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
		activeTeam,
		activeTeamId: activeTeam?.id,
		setAllTasks,
		loadTeamTasksData,
		deleteEmployeeFromTasks,
		deleteEmployeeFromTasksLoading,
		getTaskById,
		getTasksByIdLoading,
		detailedTask
	};
}
