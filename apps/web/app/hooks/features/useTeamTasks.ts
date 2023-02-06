import {
	getActiveTaskIdCookie,
	setActiveTaskIdCookie,
} from '@app/helpers/cookies';
import { ITaskStatusField, ITaskStatusStack, ITeamTask } from '@app/interfaces';
import {
	createTeamTaskAPI,
	deleteTaskAPI,
	getTeamTasksAPI,
	updateTaskAPI,
} from '@app/services/client/api';
import { activeTeamIdState } from '@app/stores';
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

export function useTeamTasks() {
	const setAllTasks = useSetRecoilState(teamTasksState);
	const tasks = useRecoilValue(tasksByTeamState);
	const [tasksFetching, setTasksFetching] = useRecoilState(tasksFetchingState);

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

	// Reload tasks after active team changed
	useEffect(() => {
		if (activeTeamId && firstLoad) {
			loadTeamTasksData();
		}
	}, [activeTeamId, firstLoad, loadTeamTasksData]);

	// Get the active task from cookie and put on global store
	useEffect(() => {
		const active_taskid = getActiveTaskIdCookie() || '';
		setActiveTeamTask(tasks.find((ts) => ts.id === active_taskid) || null);
	}, [setActiveTeamTask, tasks]);

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
		(taskName: string) => {
			return createQueryCall({
				title: taskName,
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
		(task: typeof tasks[0] | null) => {
			setActiveTaskIdCookie(task?.id || '');
			setActiveTeamTask(task);
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
		handleStatusUpdate,
		activeTeamId,
	};
}
