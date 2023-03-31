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
} from '@app/services/client/api';
import { activeTeamIdState, userState } from '@app/stores';
import {
	activeTeamTaskState,
	tasksByTeamState,
	tasksFetchingState,
	teamTasksState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';

export function useTeamTasks() {
	const setAllTasks = useSetRecoilState(teamTasksState);
	const tasks = useRecoilValue(tasksByTeamState);
	const [tasksFetching, setTasksFetching] = useRecoilState(tasksFetchingState);
	const authUser = useSyncRef(useRecoilValue(userState));

	const activeTeamId = useRecoilValue(activeTeamIdState);
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

	const loadTeamTasksData = useCallback(() => {
		return queryCall().then((res) => {
			const responseTasks = res.data?.items || [];
			if (responseTasks && responseTasks.length) {
				responseTasks.forEach((task) => {
					if (task.tags && task.tags?.length) {
						task.label = task.tags[0].name;
					}
				});
			}
			setAllTasks(res.data?.items || []);
			return res;
		});
	}, [queryCall, setAllTasks]);

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
			}
		},
		[authUser.current]
	);

	// Reload tasks after active team changed
	useEffect(() => {
		if (activeTeamId && firstLoad) {
			loadTeamTasksData();
		}
	}, [activeTeamId, firstLoad, loadTeamTasksData]);

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
			{ taskName, issue }: { taskName: string; issue?: string },
			members?: { id: string }[]
		) => {
			return createQueryCall({
				title: taskName,
				issue,
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
		activeTeamId,
		setAllTasks,
		loadTeamTasksData,
	};
}
