'use client';

import { ITeamTask, Nullable } from '@/core/types/interfaces';

import {
	activeTaskStatisticsState,
	activeTeamTaskState,
	allTaskStatisticsState,
	tasksFetchingState,
	tasksStatisticsState,
	timerStatusState
} from '@/core/stores';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import debounce from 'lodash/debounce';
import { ITasksTimesheet } from '@/core/types/interfaces/ITimer';
import { useSyncRef } from '../useSyncRef';
import { useRefreshIntervalV2 } from './useRefreshInterval';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useAuthenticateUser } from './useAuthenticateUser';
import { taskService } from '@/core/services/client/api';

export function useTaskStatistics(addSeconds = 0) {
	const { user } = useAuthenticateUser();
	const [statActiveTask, setStatActiveTask] = useAtom(activeTaskStatisticsState);
	const [statTasks, setStatTasks] = useAtom(tasksStatisticsState);
	const setTasksFetching = useSetAtom(tasksFetchingState);
	const [allTaskStatistics, setAllTaskStatistics] = useAtom(allTaskStatisticsState);

	const { firstLoad, firstLoadData: firstLoadtasksStatisticsData } = useFirstLoad();

	const { activeTeam } = useOrganizationTeams();

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
			if (!user?.employee.tenantId) {
				return;
			}
			taskService
				.tasksTimesheetStatistics(user?.employee.tenantId, '', user?.employee.organizationId, employeeId)
				.then(({ data }) => {
					setStatTasks({
						all: data.global || [],
						today: data.today || []
					});
				});
		},
		[setStatTasks, user?.employee.organizationId, user?.employee.tenantId]
	);
	const getAllTasksStatsData = useCallback(() => {
		taskService.allTaskTimesheetStatistics().then(({ data }) => {
			setAllTaskStatistics(data);
		});
	}, [setAllTaskStatistics]);

	/**
	 * Get task timesheet statistics
	 */
	const getTaskStat = useCallback(
		(task: Nullable<ITeamTask>) => {
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
		if (!user?.employee.tenantId || !user?.employee.organizationId) {
			return new Promise((resolve) => {
				resolve(true);
			});
		}

		setTasksFetching(true);

		const promise = taskService.activeTaskTimesheetStatistics(
			user?.employee.tenantId,
			'',
			user?.employee.organizationId,
			''
		);
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
	}, [setStatActiveTask, setTasksFetching, user?.employee.organizationId, user?.employee.tenantId]);

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
	}, [firstLoad, getActiveTaskStatData, user?.employee.organizationId, user?.employee.tenantId]);

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
		(timeSheet: Nullable<ITasksTimesheet>, _task: Nullable<ITeamTask>, addSeconds: number, estimate = 0) =>
			Math.min(
				Math.floor(
					(((_task?.totalWorkedTime || timeSheet?.duration || 0) + addSeconds) * 100) /
						(estimate || _task?.estimate || 0)
				),
				100
			),
		[]
	);

	const activeTaskEstimation = useMemo(() => {
		let totalWorkedTasksTimer = 0;
		activeTeam?.members?.forEach((member) => {
			const totalWorkedTasks = member?.totalWorkedTasks?.find((item) => item.id === activeTeamTask?.id) || null;
			if (totalWorkedTasks) {
				totalWorkedTasksTimer += totalWorkedTasks.duration;
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
