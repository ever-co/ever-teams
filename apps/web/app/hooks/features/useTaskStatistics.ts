import { ITeamTask } from '@app/interfaces';
import {
	activeTaskTimesheetStatisticsAPI,
	allTaskTimesheetStatisticsAPI,
	tasksTimesheetStatisticsAPI,
} from '@app/services/client/api';
import {
	activeTaskStatisticsState,
	activeTeamTaskState,
	allTaskStatisticsState,
	tasksFetchingState,
	tasksStatisticsState,
	timerStatusState,
} from '@app/stores';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import debounce from 'lodash/debounce';
import { ITasksTimesheet } from '@app/interfaces/ITimer';
import { useSyncRef } from '../useSyncRef';
import { Nullable } from '@app/interfaces';
import { useRefreshInterval } from './useRefreshInterval';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useAuthenticateUser } from './useAuthenticateUser';

export function useTaskStatistics(addSeconds = 0) {
	const [statActiveTask, setStatActiveTask] = useRecoilState(
		activeTaskStatisticsState
	);
	const [statTasks, setStatTasks] = useRecoilState(tasksStatisticsState);
	const setTasksFetching = useSetRecoilState(tasksFetchingState);
	const [allTaskStatistics, setAllTaskStatistics] = useRecoilState(
		allTaskStatisticsState
	);

	const { firstLoad, firstLoadData: firstLoadtasksStatisticsData } =
		useFirstLoad();

	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const currentMember = activeTeam?.members?.find(
		(member) => member?.employeeId === user?.employee?.id
	);

	// Refs
	const initialLoad = useRef(false);
	const statTasksRef = useSyncRef(statTasks);

	// Dep status
	const timerStatus = useRecoilValue(timerStatusState);
	const activeTeamTask = useRecoilValue(activeTeamTaskState);

	/**
	 * Get employee all tasks statistics  (API Call)
	 */
	const getTasksStatsData = useCallback((employeeId?: string) => {
		tasksTimesheetStatisticsAPI(employeeId).then(({ data }) => {
			setStatTasks({
				all: data.global || [],
				today: data.today || [],
			});
		});
	}, []);
	const getAllTasksStatsData = useCallback(() => {
		allTaskTimesheetStatisticsAPI().then(({ data }) => {
			setAllTaskStatistics(data);
		});
	}, []);

	/**
	 * Get task timesheet statistics
	 */
	const getTaskStat = useCallback((task: Nullable<ITeamTask>) => {
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

	/**
	 * Get task estimation in
	 *
	 * @param timeSheet
	 * @param _task
	 * @param addSeconds
	 * @returns
	 */
	const getEstimation = (
		timeSheet: Nullable<ITasksTimesheet>,
		_task: Nullable<ITeamTask>,
		addSeconds: number,
		estimate: number = 0
	) =>
		Math.min(
			Math.floor(
				(((_task?.totalWorkedTime || timeSheet?.duration || 0) + addSeconds) *
					100) /
					(estimate || _task?.estimate || 0)
			),
			100
		);

	const activeTaskEstimation = useMemo(() => {
		let totalWorkedTasksTimer = 0;
		activeTeam?.members?.forEach((member) => {
			const totalWorkedTasks =
				member?.totalWorkedTasks?.find(
					(item) => item.id === activeTeamTask?.id
				) || null;
			if (totalWorkedTasks) {
				totalWorkedTasksTimer += totalWorkedTasks.duration;
			}
		});

		return getEstimation(
			null,
			activeTeamTask,
			totalWorkedTasksTimer,
			activeTeamTask?.estimate || 0
		);
	}, [activeTeam, activeTeamTask, currentMember]);

	const activeTaskDailyEstimation =
		activeTeamTask && activeTeamTask.estimate
			? getEstimation(statActiveTask.today, activeTeamTask, addSeconds)
			: 0;

	return {
		firstLoadtasksStatisticsData,
		getAllTasksStatsData,
		getTasksStatsData,
		getTaskStat,
		activeTaskTotalStat: statActiveTask.total,
		activeTaskDailyStat: statActiveTask.today,
		activeTaskEstimation,
		activeTaskDailyEstimation,
		activeTeamTask,
		addSeconds,
		getEstimation,
		allTaskStatistics,
	};
}

export function useAllTaskStatistics() {
	const { getAllTasksStatsData } = useTaskStatistics();

	useRefreshInterval(getAllTasksStatsData, 5000);
}
