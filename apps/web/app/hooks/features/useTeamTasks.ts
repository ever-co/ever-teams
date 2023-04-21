import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie,
} from '@app/helpers';
import { ITaskStatusField, ITaskStatusStack, ITeamTask } from '@app/interfaces';
import {
	createTeamTaskAPI,
	deleteTaskAPI,
	getTeamTasksAPI,
	updateTaskAPI,
	deleteEmployeeFromTasksAPI,
} from '@app/services/client/api';
import {
	activeTeamState,
	allTaskStatisticsState,
	userState,
} from '@app/stores';
import {
	activeTeamTaskState,
	tasksByTeamState,
	tasksFetchingState,
	teamTasksState,
} from '@app/stores';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';

export function useTeamTasks() {
	const setAllTasks = useSetRecoilState(teamTasksState);
	const tasks = useRecoilValue(tasksByTeamState);
	const allTaskStatistics = useRecoilValue(allTaskStatisticsState);
	const tasksRef = useSyncRef(tasks);

	const [tasksFetching, setTasksFetching] = useRecoilState(tasksFetchingState);
	const authUser = useSyncRef(useRecoilValue(userState));

	const activeTeam = useRecoilValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);

	const [activeTeamTask, setActiveTeamTask] =
		useRecoilState(activeTeamTaskState);

	const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();

	// Queries hooks
	const { queryCall, loading } = useQuery(getTeamTasksAPI);

	const { queryCall: deleteQueryCall, loading: deleteLoading } =
		useQuery(deleteTaskAPI);

	const { queryCall: createQueryCall, loading: createLoading } =
		useQuery(createTeamTaskAPI);

	const { queryCall: updateQueryCall, loading: updateLoading } =
		useQuery(updateTaskAPI);

	const {
		queryCall: deleteEmployeeFromTasksQueryCall,
		loading: deleteEmployeeFromTasksLoading,
	} = useQuery(deleteEmployeeFromTasksAPI);

	const loadTeamTasksData = useCallback(
		(deepCheck?: boolean) => {
			return queryCall().then((res) => {
				const responseTasks = res.data?.items || [];
				if (responseTasks && responseTasks.length) {
					responseTasks.forEach((task) => {
						if (task.tags && task.tags?.length) {
							task.label = task.tags[0].name;
						}

						const taskStatistics = allTaskStatistics.find(
							(statistics) => statistics.id === task.id
						);
						task.totalWorkedTime = taskStatistics?.duration || 0;
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

				return res;
			});
		},
		[queryCall, setAllTasks, allTaskStatistics]
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
					userId: authUser.current?.id,
				});
			} else {
				setActiveUserTaskCookie({
					taskId: '',
					userId: '',
				});
			}
		},
		[authUser.current]
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
	}, [setActiveTeamTask, tasks, firstLoad]);

	// Queries calls
	const deleteTask = useCallback(
		(task: typeof tasks[0]) => {
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
			{ taskName, issueType }: { taskName: string; issueType?: string },
			members?: { id: string }[]
		) => {
			return createQueryCall({
				title: taskName,
				issueType,
				...(members ? { members } : {}),
			}).then((res) => {
				setAllTasks(res.data?.items || []);
				return res;
			});
		},
		[createQueryCall, setAllTasks]
	);

	const updateTask = useCallback(
		(task: Partial<ITeamTask> & { id: string }) => {
			return updateQueryCall(task.id, task).then((res) => {
				setAllTasks(res.data?.items || []);
				return res;
			});
		},
		[setAllTasks, updateQueryCall]
	);

	const updateTitle = useCallback(
		(newTitle: string, task?: ITeamTask | null, loader?: boolean) => {
			if (task && newTitle !== task.title) {
				loader && setTasksFetching(true);
				return updateTask({
					...task,
					title: newTitle,
				}).then((res) => {
					setTasksFetching(false);
					return res;
				});
			}
			return Promise.resolve();
		},
		[updateTask]
	);

	const updateDescription = useCallback(
		(newDescription: string, task?: ITeamTask | null, loader?: boolean) => {
			if (task && newDescription !== task.description) {
				loader && setTasksFetching(true);
				return updateTask({
					...task,
					description: newDescription,
				}).then((res) => {
					setTasksFetching(false);
					return res;
				});
			}
			return Promise.resolve();
		},
		[updateTask]
	);

	const handleStatusUpdate = useCallback(
		<T extends ITaskStatusField>(
			status: ITaskStatusStack[T],
			field: T,
			task?: ITeamTask | null,
			loader?: boolean
		) => {
			if (task && status !== task.status) {
				loader && setTasksFetching(true);

				if (field === 'status' && status === 'closed') {
					const active_user_task = getActiveUserTaskCookie();
					if (active_user_task?.taskId === task.id) {
						setActiveUserTaskCookie({
							taskId: '',
							userId: '',
						});
					}
					const active_task_id = getActiveTaskIdCookie();
					if (active_task_id === task.id) {
						setActiveTaskIdCookie('');
					}
				}

				return updateTask({
					...task,
					[field]: status,
				}).then((res) => {
					setTasksFetching(false);
					return res;
				});
			}

			return Promise.resolve();
		},
		[updateTask]
	);

	/**
	 * Change active task
	 */
	const setActiveTask = useCallback(
		(task: ITeamTask | null) => {
			setActiveTaskIdCookie(task?.id || '');
			setActiveTeamTask(task);
			setActiveUserTaskCookieCb(task);
		},
		[setActiveTeamTask]
	);

	const deleteEmployeeFromTasks = useCallback(
		(employeeId: string, organizationTeamId: string) => {
			deleteEmployeeFromTasksQueryCall(employeeId, organizationTeamId);
		},
		[deleteEmployeeFromTasksQueryCall]
	);

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
		handleStatusUpdate,
		activeTeamId: activeTeam?.id,
		setAllTasks,
		loadTeamTasksData,
		deleteEmployeeFromTasks,
		deleteEmployeeFromTasksLoading,
	};
}
