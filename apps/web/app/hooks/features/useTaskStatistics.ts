import { ITeamTask } from '@app/interfaces/ITask';
import {
	activeTaskTimesheetStatisticsAPI,
	tasksTimesheetStatisticsAPI,
} from '@app/services/client/api';
import {
	activeTaskStatisticsState,
	activeTeamTaskState,
	tasksFetchingState,
	tasksStatisticsState,
	timerStatusState,
} from '@app/stores';
import { useCallback, useEffect, useRef } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import debounce from 'lodash/debounce';
import { ITasksTimesheet } from '@app/interfaces/ITimer';
import { useSyncRef } from '../useSyncRef';

export function useTaskStatistics(addSeconds = 0) {
	const [statActiveTask, setStatActiveTask] = useRecoilState(
		activeTaskStatisticsState
	);
	const [statTasks, setStatTasks] = useRecoilState(tasksStatisticsState);
	const setTasksFetching = useSetRecoilState(tasksFetchingState);

	const { firstLoad, firstLoadData: firstLoadtasksStatisticsData } =
		useFirstLoad();

	// Refs
	const initialLoad = useRef(false);
	const statTasksRef = useSyncRef(statTasks);

	// Dep status
	const timerStatus = useRecoilValue(timerStatusState);
	const activeTeamTask = useRecoilValue(activeTeamTaskState);

	/**
	 * Get employee all tasks statistics  (API Call)
	 */
	const getAllTasksStatsData = useCallback(() => {
		tasksTimesheetStatisticsAPI().then(({ data }) => {
			setStatTasks({
				all: data.global || [],
				today: data.today || [],
			});
		});
	}, []);

	const getTaskStat = useCallback((task: ITeamTask | null) => {
		const stats = statTasksRef.current;
		return {
			taskTotalStat: stats.all.find((t) => t.id === task?.id),
			taskDailyStat: stats.today.find((t) => t.id === task?.id),
		};
	}, []);

	/**
	 * Get statistics of the active tasks fresh (API Call)
	 */
	const getActiveTaskStatData = useCallback(() => {
		setTasksFetching(true);
		const promise = activeTaskTimesheetStatisticsAPI();
		promise.then(({ data }) => {
			setStatActiveTask({
				total: data.global ? data.global[0] || null : null,
				today: data.today ? data.today[0] || null : null,
			});
		});
		promise.finally(() => {
			setTasksFetching(false);
		});
		return promise;
	}, []);

	const debounceLoadActiveTaskStat = useCallback(
		debounce(getActiveTaskStatData, 100),
		[]
	);

	/**
	 * Get statistics of the active tasks at the component load
	 */
	useEffect(() => {
		if (firstLoad) {
			getActiveTaskStatData().then(() => {
				initialLoad.current = true;
			});
		}
	}, [firstLoad]);

	/**
	 * Get fresh statistic of the active task
	 */
	useEffect(() => {
		if (firstLoad && initialLoad.current) {
			debounceLoadActiveTaskStat();
		}
	}, [firstLoad, timerStatus, activeTeamTask?.id]);

	/**
	 * set null to active team stats when active team or active task are changed
	 */
	useEffect(() => {
		if (firstLoad && initialLoad.current) {
			setStatActiveTask({
				today: null,
				total: null,
			});
		}
	}, [firstLoad, activeTeamTask?.id]);

	const getEstimation = (_task: ITasksTimesheet | null) =>
		Math.min(
			Math.floor(
				(((_task?.duration || 0) + addSeconds) * 100) /
					(activeTeamTask?.estimate || 0)
			),
			100
		);

	return {
		firstLoadtasksStatisticsData,
		getAllTasksStatsData,
		getTaskStat,
		activeTaskTotalStat: statActiveTask.total,
		activeTaskDailyStat: statActiveTask.today,
		activeTaskEstimation:
			activeTeamTask && activeTeamTask.estimate
				? getEstimation(statActiveTask.total)
				: 0,
		activeTaskDailyEstimation:
			activeTeamTask && activeTeamTask.estimate
				? getEstimation(statActiveTask.today)
				: 0,
	};
}
