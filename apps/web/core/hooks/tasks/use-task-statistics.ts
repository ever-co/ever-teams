'use client';

import {
	activeTaskStatisticsState,
	activeTeamState,
	activeTeamTaskState,
	allTaskStatisticsState,
	tasksFetchingState,
	tasksStatisticsState,
	timerStatusState
} from '@/core/stores';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useFirstLoad } from '../common/use-first-load';
import debounce from 'lodash/debounce';
import { useSyncRef } from '../common/use-sync-ref';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { useAuthenticateUser } from '../auth';
import { useRefreshIntervalV2 } from '../common';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';

export function useTaskStatistics(addSeconds = 0) {
	const { user } = useAuthenticateUser();
	const [statActiveTask, setStatActiveTask] = useAtom(activeTaskStatisticsState);
	const [statTasks, setStatTasks] = useAtom(tasksStatisticsState);
	const setTasksFetching = useSetAtom(tasksFetchingState);
	const [allTaskStatistics, setAllTaskStatistics] = useAtom(allTaskStatisticsState);

	const { firstLoad, firstLoadData: firstLoadtasksStatisticsData } = useFirstLoad();

	const activeTeam = useAtomValue(activeTeamState);

	// Refs
	const initialLoad = useRef(false);
	const statTasksRef = useSyncRef(statTasks);

	// Dep status
	const timerStatus = useAtomValue(timerStatusState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	/**
	 * Get employee all tasks statistics  (API Call)
	 */
	const getTasksStatsData = useCallback(
		(employeeId?: string) => {
			if (!user?.employee?.tenantId) {
				return;
			}
			statisticsService
				.tasksTimesheetStatistics({
					employeeId
				})
				.then(({ data }) => {
					setStatTasks({
						all: data.global || [],
						today: data.today || []
					});
				});
		},
		[setStatTasks, user?.employee?.organizationId, user?.employee?.tenantId]
	);
	const getAllTasksStatsData = useCallback(() => {
		statisticsService.allTaskTimesheetStatistics().then((data) => {
			if (Array.isArray(data)) {
				setAllTaskStatistics(data);
			}
		});
	}, [setAllTaskStatistics]);

	/**
	 * Get task timesheet statistics
	 */
	const getTaskStat = useCallback(
		(task: Nullable<TTask>) => {
			const stats = statTasksRef.current;
			return {
				taskTotalStat: stats.all.find((t) => t.id === task?.id),
				taskDailyStat: stats.today.find((t) => t.id === task?.id)
			};
		},
		[statTasksRef]
	);

	/**
	 * Get statistics of the active tasks fresh (API Call)
	 */
	const getActiveTaskStatData = useCallback(() => {
		if (!user?.employee?.tenantId || !user?.employee?.organizationId) {
			return new Promise((resolve) => {
				resolve(true);
			});
		}

		setTasksFetching(true);

		if (
			!user?.employee?.tenantId ||
			!activeTeamTask?.id ||
			!user?.employee?.organizationId ||
			!user?.employee?.id
		) {
			return new Promise((resolve) => {
				resolve(true);
			});
		}

		const promise = statisticsService.activeTaskTimesheetStatistics({
			activeTaskId: activeTeamTask?.id || '',
			employeeId: user?.employee?.id
		});
		promise.then(({ data }) => {
			setStatActiveTask({
				total: data.global ? data.global[0] || null : null,
				today: data.today ? data.today[0] || null : null
			});
		});
		promise.finally(() => {
			setTasksFetching(false);
		});
		return promise;
	}, [setStatActiveTask, setTasksFetching, user?.employee?.organizationId, user?.employee?.tenantId]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debounceLoadActiveTaskStat = useCallback(debounce(getActiveTaskStatData, 100), []);

	/**
	 * Get statistics of the active tasks at the component load
	 */
	useEffect(() => {
		if (firstLoad) {
			getActiveTaskStatData().then(() => {
				initialLoad.current = true;
			});
		}
	}, [firstLoad, getActiveTaskStatData, user?.employee?.organizationId, user?.employee?.tenantId]);

	/**
	 * Get fresh statistic of the active task
	 */
	useEffect(() => {
		if (firstLoad && initialLoad.current) {
			debounceLoadActiveTaskStat();
		}
	}, [firstLoad, timerStatus, activeTeamTask?.id, debounceLoadActiveTaskStat]);

	/**
	 * set null to active team stats when active team or active task are changed
	 */
	useEffect(() => {
		if (firstLoad && initialLoad.current) {
			setStatActiveTask({
				today: null,
				total: null
			});
		}
	}, [firstLoad, activeTeamTask?.id, setStatActiveTask]);

	/**
	 * Get task estimation in
	 *
	 * @param timeSheet
	 * @param _task
	 * @param addSeconds
	 * @returns
	 */
	const getEstimation = useCallback(
		(timeSheet: Nullable<TTaskStatistic>, _task: Nullable<TTask>, addSeconds: number, estimate = 0) => {
			const totalEstimate = estimate || _task?.estimate || 0;

			// Return 0 (neutral state) when there's no estimation data
			if (totalEstimate === 0) {
				return 0;
			}

			return Math.min(
				Math.floor((((_task?.totalWorkedTime || timeSheet?.duration || 0) + addSeconds) * 100) / totalEstimate),
				100
			);
		},
		[]
	);

	const activeTaskEstimation = useMemo(() => {
		let totalWorkedTasksTimer = 0;
		activeTeam?.members?.forEach((member: any) => {
			const totalWorkedTasks =
				member?.totalWorkedTasks?.find((item: TTask) => item.id === activeTeamTask?.id) || null;
			if (totalWorkedTasks) {
				totalWorkedTasksTimer += totalWorkedTasks?.duration || 0;
			}
		});

		return getEstimation(null, activeTeamTask, totalWorkedTasksTimer, activeTeamTask?.estimate || 0);
	}, [activeTeam, activeTeamTask, getEstimation]);

	const activeTaskDailyEstimation =
		activeTeamTask && activeTeamTask.estimate ? getEstimation(statActiveTask.today, activeTeamTask, addSeconds) : 0;

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
		allTaskStatistics
	};
}

export function useAllTaskStatistics() {
	const { getAllTasksStatsData } = useTaskStatistics();

	useRefreshIntervalV2(getAllTasksStatsData, 5000);
}
