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
import { useRefreshIntervalV2 } from '../common';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../queries/user-user.query';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';
import { getTaskTotalWorkedDuration } from '@/core/lib/utils/task.utils';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import type { ApiRequestScope } from '@/core/services/client/api-request-scope';
import { useScopeGuard } from '../bootstrap/use-scope-guard';
import { useIsomorphicLayoutEffect } from '../common/use-isomorphic-layout-effect';

interface UseTaskStatisticsOptions {
	enabled?: boolean;
	scope?: ApiRequestScope;
	refetchInterval?: number | false;
}

export function useTaskStatistics(addSeconds = 0, options: UseTaskStatisticsOptions = {}) {
	const { data: user } = useUserQuery();
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
	const { enabled = true, scope, refetchInterval = false } = options;
	const scoped = scope !== undefined;
	const statisticsKey = scoped
		? queryKeys.tasks.statisticsByScope(
				scope.tenantId,
				scope.organizationId,
				scope.teamId,
				activeTeamTask?.id,
				user?.employee?.id
			)
		: queryKeys.tasks.statistics(activeTeam?.id);
	const isCurrentScope = useScopeGuard(statisticsKey, scoped && enabled);
	const scopedReady = !!(
		scope?.tenantId &&
		scope.organizationId &&
		scope.teamId &&
		scope.accessToken &&
		activeTeamTask?.id &&
		user?.employee?.id
	);
	const activeStatsQuery = useQuery({
		queryKey: statisticsKey,
		queryFn: ({ signal }) =>
			statisticsService.activeTaskTimesheetStatistics({
				activeTaskId: activeTeamTask!.id,
				employeeId: user?.employee?.id,
				options: { scope: scope!, signal }
			}),
		enabled: scoped && enabled && scopedReady,
		refetchInterval: scoped ? refetchInterval : false,
		refetchIntervalInBackground: false
	});

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
					employeeId,
					...(scoped ? { options: { scope: scope! } } : {})
				})
				.then(({ data }) => {
					if (scoped && !isCurrentScope()) return;
					setStatTasks({
						all: data.global || [],
						today: data.today || []
					});
				});
		},
		[isCurrentScope, scope, scoped, setStatTasks, user?.employee?.tenantId]
	);
	const getAllTasksStatsData = useCallback(() => {
		statisticsService.allTaskTimesheetStatistics().then((data) => {
			if (scoped && !isCurrentScope()) return;
			if (Array.isArray(data)) {
				setAllTaskStatistics(data);
			}
		});
	}, [isCurrentScope, scoped, setAllTaskStatistics]);

	useEffect(() => {
		if (!scoped || !enabled || !activeStatsQuery.data || !isCurrentScope()) return;
		const { data } = activeStatsQuery.data;
		setStatActiveTask({
			total: data.global ? data.global[0] || null : null,
			today: data.today ? data.today[0] || null : null
		});
	}, [activeStatsQuery.data, enabled, isCurrentScope, scoped, setStatActiveTask]);

	useEffect(() => {
		if (scoped && enabled && isCurrentScope()) setTasksFetching(activeStatsQuery.isFetching);
		return () => {
			if (scoped && isCurrentScope()) setTasksFetching(false);
		};
	}, [activeStatsQuery.isFetching, enabled, isCurrentScope, scoped, setTasksFetching]);

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
		if (scoped) {
			if (!enabled || !scopedReady) return Promise.resolve(true);
			return activeStatsQuery.refetch().then((result) => result.data ?? true);
		}
		// Check all required conditions before setting loading state
		if (!user?.employee?.tenantId || !user?.employee?.organizationId) {
			return new Promise((resolve) => {
				resolve(true);
			});
		}

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

		// Only set loading state after all guards pass
		setTasksFetching(true);

		const promise = statisticsService.activeTaskTimesheetStatistics({
			activeTaskId: activeTeamTask?.id || '',
			employeeId: user?.employee?.id
		});
		promise.then(({ data }) => {
			if (scoped && !isCurrentScope()) return;
			setStatActiveTask({
				total: data.global ? data.global[0] || null : null,
				today: data.today ? data.today[0] || null : null
			});
		});
		promise.finally(() => {
			setTasksFetching(false);
		});
		return promise;
	}, [
		setStatActiveTask,
		setTasksFetching,
		activeTeam?.id,
		activeStatsQuery,
		enabled,
		isCurrentScope,
		scoped,
		scopedReady,
		user?.employee?.id,
		user?.employee?.organizationId,
		user?.employee?.tenantId
	]);

	const debounceLoadActiveTaskStat = useCallback(debounce(getActiveTaskStatData, 100), [getActiveTaskStatData]);

	// Cleanup debounced function when getActiveTaskStatData changes or component unmounts
	useEffect(() => {
		return () => {
			debounceLoadActiveTaskStat.cancel?.();
		};
	}, [debounceLoadActiveTaskStat]);

	/**
	 * Get statistics of the active tasks at the component load
	 */
	useEffect(() => {
		if (!scoped && enabled && firstLoad) {
			getActiveTaskStatData().then(() => {
				initialLoad.current = true;
			});
		}
	}, [enabled, firstLoad, getActiveTaskStatData, scoped, user?.employee?.organizationId, user?.employee?.tenantId]);

	/**
	 * Get fresh statistic of the active task
	 */
	useEffect(() => {
		if (!scoped && enabled && firstLoad && initialLoad.current) {
			debounceLoadActiveTaskStat();
		}
	}, [enabled, firstLoad, timerStatus, activeTeamTask?.id, debounceLoadActiveTaskStat, scoped]);

	/**
	 * set null to active team stats when active team or active task are changed
	 */
	useIsomorphicLayoutEffect(() => {
		if (
			(!scoped && firstLoad && initialLoad.current) ||
			(scoped && (!activeTeamTask?.id || (enabled && isCurrentScope())))
		) {
			setStatActiveTask({
				today: null,
				total: null
			});
		}
	}, [activeTeamTask?.id, enabled, firstLoad, isCurrentScope, scoped, setStatActiveTask]);

	/**
	 * Get task estimation percentage.
	 *
	 * @param timeSheet - Optional timesheet stat (used for daily estimation fallback)
	 * @param _task - The task to estimate progress for
	 * @param addSeconds - Total worked seconds (callers provide totalWorkedTasksTimer + localTimerSeconds)
	 * @param estimate - Override for the task estimate (in seconds)
	 * @returns Progress percentage (0-100)
	 */
	const getEstimation = useCallback(
		(timeSheet: Nullable<TTaskStatistic>, _task: Nullable<TTask>, addSeconds: number, estimate = 0) => {
			const totalEstimate = estimate || _task?.estimate || 0;

			// Return 0 (neutral state) when there's no estimation data
			if (totalEstimate === 0) {
				return 0;
			}

			// Use timeSheet?.duration as base only when provided (daily estimation).
			// Do NOT add _task?.totalWorkedTime — callers already include total worked time in addSeconds,
			// which would cause double-counting and inflate the progress bar.
			const baseWorkedTime = timeSheet?.duration || 0;

			return Math.min(Math.floor(((baseWorkedTime + addSeconds) * 100) / totalEstimate), 100);
		},
		[]
	);

	const activeTaskEstimation = useMemo(() => {
		const totalWorkedTasksTimer = getTaskTotalWorkedDuration(activeTeam?.members, activeTeamTask?.id);

		// Add local timer seconds (addSeconds) to the total worked time
		// This ensures the progress bar updates in real-time as the timer runs locally
		const estimation = getEstimation(
			null,
			activeTeamTask,
			totalWorkedTasksTimer + addSeconds,
			activeTeamTask?.estimate || 0
		);

		return estimation;
	}, [activeTeam?.members, activeTeamTask, getEstimation, addSeconds]);

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
