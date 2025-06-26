'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { convertMsToTime, secondsToTime } from '@/core/lib/helpers/date-and-time';
import {
	localTimerStatusState,
	timeCounterIntervalState,
	timeCounterState,
	timerSecondsState,
	timerStatusFetchingState,
	timerStatusState
} from '@/core/stores';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../common/use-first-load';
import { useQueryCall } from '../common/use-query';
import { useSyncRef } from '../common/use-sync-ref';
import { useTaskStatistics } from '../tasks/use-task-statistics';
import isEqual from 'lodash/isEqual';
import moment from 'moment';
import { usePathname } from 'next/navigation';
import { useTaskStatus } from '../tasks/use-task-status';
import { useDailyPlan } from '../daily-plans/use-daily-plan';
import { timerService } from '@/core/services/client/api/timers';
import { useOrganizationEmployeeTeams, useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { useRefreshIntervalV2 } from '../common';
import { ILocalTimerStatus, ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TUser } from '@/core/types/schemas/user/user.schema';

const LOCAL_TIMER_STORAGE_KEY = 'local-timer-ever-team';

/**
 * ! Don't modify this function unless you know what you're doing
 * "This function is used to update the local timer status and time counter."
 *
 * The function is used in the `Timer` component
 * @param {ITimerStatus | null} timerStatus - ITimerStatus | null,
 * @param {TTask | null} activeTeamTask - TTask | null - the current active task
 * @param {boolean} firstLoad - boolean - this is a flag that indicates that the component is loaded
 * for the first time.
 * @returns An object with the following properties:
 */
function useLocalTimeCounter(timerStatus: ITimerStatus | null, activeTeamTask: TTask | null, firstLoad: boolean) {
	const [timeCounterInterval, setTimeCounterInterval] = useAtom(timeCounterIntervalState);
	const [localTimerStatus, setLocalTimerStatus] = useAtom(localTimerStatusState);

	const [timeCounter, setTimeCounter] = useAtom(timeCounterState); // in millisencods
	const [timerSeconds, setTimerSeconds] = useAtom(timerSecondsState);

	// Refs
	const timerStatusRef = useSyncRef(timerStatus);
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
	const timerSecondsRef = useRef(0);
	const seconds = Math.floor(timeCounter / 1000);

	const updateLocalStorage = useCallback((status: ILocalTimerStatus) => {
		localStorage.setItem(LOCAL_TIMER_STORAGE_KEY, JSON.stringify(status));
	}, []);

	const updateLocalTimerStatus = useCallback(
		(status: ILocalTimerStatus) => {
			updateLocalStorage(status); // the order is important (first update localstorage, then update the store state)
			setLocalTimerStatus(status);
		},
		[updateLocalStorage, setLocalTimerStatus]
	);

	const getLocalCounterStatus = useCallback(() => {
		let data: ILocalTimerStatus | null = null;
		try {
			data = JSON.parse(localStorage.getItem(LOCAL_TIMER_STORAGE_KEY) || 'null');
		} catch (error) {
			console.log(error);
		}
		return data;
	}, []);

	// Update local time status (storage and store) only when global timerStatus changes
	useEffect(() => {
		if (firstLoad) {
			const localStatus = getLocalCounterStatus();
			localStatus && setLocalTimerStatus(localStatus);

			const timerStatusDate = timerStatus?.lastLog?.createdAt
				? moment(timerStatus?.lastLog?.createdAt).unix() * 1000 - timerStatus?.lastLog?.duration
				: 0;

			timerStatus &&
				updateLocalTimerStatus({
					runnedDateTime:
						(timerStatus.running ? timerStatusDate || Date.now() : 0) || localStatus?.runnedDateTime || 0,
					running: timerStatus.running || false,
					lastTaskId: timerStatus.lastLog?.taskId || null
				});
		}
	}, [firstLoad, timerStatus, getLocalCounterStatus, setLocalTimerStatus, updateLocalTimerStatus]);

	// THis is form constant update of the progress line
	timerSecondsRef.current = useMemo(() => {
		if (!firstLoad) return 0;
		if (seconds > timerSecondsRef.current) {
			return seconds;
		}
		if (timerStatusRef.current && !timerStatusRef.current.running) {
			return 0;
		}
		return timerSecondsRef.current;
	}, [seconds, firstLoad, timerStatusRef]);

	useEffect(() => {
		if (firstLoad) {
			timerSecondsRef.current = 0;
			setTimerSeconds(0);
		}
	}, [activeTeamTask?.id, setTimerSeconds, firstLoad, timerSecondsRef]);

	useEffect(() => {
		if (firstLoad) {
			setTimerSeconds(timerSecondsRef.current);
		}
	}, [setTimerSeconds, firstLoad]);

	// Time Counter
	useEffect(() => {
		if (!firstLoad || !localTimerStatus) return;
		window.clearInterval(timeCounterIntervalRef.current);
		if (localTimerStatus.running) {
			setTimeCounterInterval(
				window.setInterval(() => {
					const now = Date.now();
					setTimeCounter(now - localTimerStatus.runnedDateTime);
				}, 50)
			);
		} else {
			setTimeCounter(0);
		}
	}, [localTimerStatus, firstLoad, setTimeCounter, setTimeCounterInterval, timeCounterIntervalRef]);

	return {
		updateLocalTimerStatus,
		timeCounter,
		timerSeconds: timerSeconds
	};
}

/**
 * It returns a bunch of data and functions related to the timer
 */
export function useTimer() {
	const pathname = usePathname();
	const { updateTask, setActiveTask, detailedTask, activeTeamId, activeTeam, activeTeamTask } = useTeamTasks();
	const { taskStatuses } = useTaskStatus();
	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const { user, $user } = useAuthenticateUser();
	const { myDailyPlans } = useDailyPlan();

	const [timerStatus, setTimerStatus] = useAtom(timerStatusState);

	const [timerStatusFetching, setTimerStatusFetching] = useAtom(timerStatusFetchingState);

	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad();
	const queryClient = useQueryClient();

	// Queries
	const { queryCall, loading, loadingRef } = useQueryCall(async (tenantId: string, organizationId: string) =>
		queryClient.fetchQuery({
			queryKey: ['timer'],
			queryFn: () => timerService.getTimerStatus(tenantId, organizationId)
		})
	);
	// const { queryCall, loading, loadingRef } = useQueryCall(timerService.getTimerStatus);

	const toggleTimerMutation = useMutation({
		mutationFn: async (taskId: string) => {
			return await timerService.toggleTimer({ taskId });
		}
	});

	// const { queryCall: startTimerQueryCall } = useQueryCall(async () =>
	// 	queryClient.fetchQuery({
	// 		queryKey: ['timer'],
	// 		queryFn: timerService.startTimer
	// 	})
	// );

	const stopTimerMutation = useMutation({
		mutationFn: async (source: ETimeLogSource) => {
			return await timerService.stopTimer(source);
		}
	});

	// const { queryCall: stopTimerQueryCall, loading: stopTimerLoading } = useQueryCall(async (source: ETimeLogSource) =>
	// 	queryClient.fetchQuery({
	// 		queryKey: ['timer'],
	// 		queryFn: () => timerService.stopTimer(source)
	// 	})
	// );
	// const { queryCall: stopTimerQueryCall, loading: stopTimerLoading } = useQueryCall(async () => timerService.stopTimer);

	const startTimerMutation = useMutation({
		mutationFn: timerService.startTimer
	});

	// const {
	// 	queryCall: syncTimerQueryCall,
	// 	loading: syncTimerLoading,
	// 	loadingRef: syncTimerLoadingRef
	// } = useQueryCall(async (source: ETimeLogSource, user?: TUser | null) =>
	// 	queryClient.fetchQuery({
	// 		queryKey: ['timer'],
	// 		queryFn: () => timerService.syncTimer(source, user)
	// 	})
	// );

	const syncTimerMutation = useMutation({
		mutationFn: async (data: { source: ETimeLogSource; user?: TUser | null }) => {
			await timerService.syncTimer(data.source, data.user);
		}
	});

	// const wasRunning = timerStatus?.running || false;
	const timerStatusRef = useSyncRef(timerStatus);
	const taskId = useSyncRef(activeTeamTask?.id);
	const activeTeamTaskRef = useSyncRef(activeTeamTask);
	const lastActiveTeamId = useRef<string | null>(null);
	const lastActiveTaskId = useRef<string | null>(null);

	// Find if the connected user has a today plan. Help to know if he can track time when require daily plan is set to true
	const hasPlan = myDailyPlans?.items.find(
		(plan: TDailyPlan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]) &&
			plan.tasks &&
			plan.tasks?.length > 0
	);

	const tomorrow = moment().add(1, 'days');
	const hasPlanForTomorrow = myDailyPlans?.items.find(
		(plan: TDailyPlan) => moment(plan.date).format('YYYY-MM-DD') === tomorrow.format('YYYY-MM-DD')
	);

	// Team setting that tells if each member must have a today plan for allowing tracking time
	const requirePlan = activeTeam?.requirePlanToTrack;

	// If require plan setting is activated but user don't have plan, block time tracking until a today plan will be added
	let canTrack = true;

	if (requirePlan) {
		if (!hasPlan) canTrack = false;
	}

	// If require plan setting is activated,
	// check if the today plan has working time planned and all the tasks into the plan are estimated
	const isPlanVerified = requirePlan
		? hasPlan &&
			hasPlan?.workTimePlanned > 0 &&
			!!hasPlan?.tasks?.every((task) => task.estimate && task.estimate > 0)
		: true;

	const canRunTimer =
		user?.isEmailVerified &&
		((!!activeTeamTask && activeTeamTask.status !== 'closed') ||
			// If timer is running at some other source and user may or may not have selected the task
			timerStatusRef.current?.lastLog?.source !== ETimeLogSource.TEAMS);

	// Local time status
	const { timeCounter, updateLocalTimerStatus, timerSeconds } = useLocalTimeCounter(
		timerStatus,
		activeTeamTask,
		firstLoad
	);

	const getTimerStatus = useCallback(
		(deepCheck?: boolean) => {
			if (loadingRef.current || !user?.tenantId) {
				return;
			}
			return queryCall(user?.tenantId, user?.employee?.organizationId || '').then((res) => {
				if (res.data && !isEqual(timerStatus, res.data)) {
					setTimerStatus((t: ITimerStatus | null) => {
						if (deepCheck) {
							return res.data.running !== t?.running ? res.data : t;
						}
						return res.data;
					});
				}
				return res;
			});
		},
		[timerStatus, setTimerStatus, queryCall, loadingRef, user]
	);

	const toggleTimer = useCallback(
		(taskId: string, updateStore = true) => {
			return toggleTimerMutation.mutateAsync(taskId).then((res) => {
				if (updateStore && res.data && !isEqual(timerStatus, res.data)) {
					setTimerStatus(res.data);
				}
				return res;
			});
		},
		[timerStatus, toggleTimerMutation, setTimerStatus]
	);

	const syncTimer = useCallback(() => {
		if (syncTimerMutation.isPending) {
			return;
		}
		return syncTimerMutation
			.mutateAsync({ source: timerStatus?.lastLog?.source || ETimeLogSource.TEAMS, user: $user.current })
			.then((res) => {
				return res;
			});
	}, [syncTimerMutation, timerStatus]);

	// Loading states
	useEffect(() => {
		if (firstLoad) {
			setTimerStatusFetching(loading);
		}
	}, [loading, firstLoad, setTimerStatusFetching]);

	useEffect(() => {
		setTimerStatusFetching(stopTimerMutation.isPending);
	}, [stopTimerMutation.isPending, setTimerStatusFetching]);

	// Start timer
	const startTimer = useCallback(async () => {
		if (pathname?.startsWith('/task/')) setActiveTask(detailedTask);
		if (!taskId.current) return;
		updateLocalTimerStatus({
			lastTaskId: taskId.current,
			runnedDateTime: Date.now(),
			running: true
		});

		setTimerStatusFetching(true);
		const promise = startTimerMutation.mutateAsync().then((res) => {
			res.data && !isEqual(timerStatus, res.data) && setTimerStatus(res.data);
			return;
		});

		promise.catch(() => {
			if (taskId.current) {
				updateLocalTimerStatus({
					lastTaskId: taskId.current,
					runnedDateTime: 0,
					running: false
				});
			}
		});

		/**
		 *  Updating the task status to "In Progress" when the timer is started.
		 */
		if (activeTeamTaskRef.current && activeTeamTaskRef.current.status !== 'in-progress') {
			const selectedStatus = taskStatuses.find((s) => s.name === 'in-progress' && s.value === 'in-progress');
			const taskStatusId = selectedStatus?.id;
			updateTask({
				...activeTeamTaskRef.current,
				taskStatusId: taskStatusId ?? activeTeamTaskRef.current.taskStatusId,
				status: ETaskStatusName.IN_PROGRESS
			});
		}

		if (activeTeamTaskRef.current) {
			// Update Current user's active task to sync across multiple devices
			const currentEmployeeDetails = activeTeam?.members?.find(
				(member) => member.employeeId === user?.employee?.id
			);
			if (currentEmployeeDetails && currentEmployeeDetails.id) {
				updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.id, {
					organizationId: activeTeamTaskRef.current.organizationId,
					activeTaskId: activeTeamTaskRef.current.id,
					organizationTeamId: activeTeam?.id,
					tenantId: activeTeam?.tenantId ?? ''
				});
			}
		}

		promise.finally(() => setTimerStatusFetching(false));

		return promise;
	}, [
		pathname,
		setActiveTask,
		detailedTask,
		taskId,
		updateLocalTimerStatus,
		setTimerStatusFetching,
		startTimerMutation,
		activeTeamTaskRef,
		timerStatus,
		setTimerStatus,
		taskStatuses,
		updateTask,
		activeTeam?.members,
		activeTeam?.id,
		activeTeam?.tenantId,
		user?.employee?.id,
		updateOrganizationTeamEmployeeActiveTask
	]);

	// Stop timer
	const stopTimer = useCallback(() => {
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false
		});

		syncTimer();

		return stopTimerMutation.mutateAsync(timerStatus?.lastLog?.source || ETimeLogSource.TEAMS).then((res) => {
			res.data && !isEqual(timerStatus, res.data) && setTimerStatus(res.data);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timerStatus, setTimerStatus, stopTimerMutation, taskId, updateLocalTimerStatus]);

	useEffect(() => {
		let syncTimerInterval: NodeJS.Timeout;
		if (timerStatus?.running && firstLoad) {
			syncTimerInterval = setInterval(() => {
				syncTimer();
			}, 60000);
		}
		return () => {
			if (syncTimerInterval) clearInterval(syncTimerInterval);
		};
	}, [syncTimer, timerStatus, firstLoad]);

	// If active team changes then stop the timer
	useEffect(() => {
		if (
			lastActiveTeamId.current !== null &&
			activeTeamId !== lastActiveTeamId.current &&
			firstLoad &&
			timerStatusRef.current?.running
		) {
			// If timer is started at some other source keep the timer running...
			// If timer is started in the browser Stop the timer on Team Change
			if (timerStatusRef.current.lastLog?.source === ETimeLogSource.TEAMS) {
				stopTimer();
			}
		}
		if (activeTeamId) {
			lastActiveTeamId.current = activeTeamId;
		}
	}, [firstLoad, activeTeamId, stopTimer, timerStatusRef]);

	// If active task changes then stop the timer
	useEffect(() => {
		const taskId = activeTeamTask?.id;
		const canStop = lastActiveTaskId.current !== null && taskId !== lastActiveTaskId.current;

		if (canStop && timerStatusRef.current?.running && firstLoad) {
			// If timer is started at some other source keep the timer running...
			// If timer is started in the browser Stop the timer on Task Change
			if (timerStatusRef.current.lastLog?.source === ETimeLogSource.TEAMS) {
				stopTimer();
			}
		}

		if (taskId) {
			lastActiveTaskId.current = taskId;
		}
	}, [firstLoad, activeTeamTask?.id, stopTimer, timerStatusRef]);

	return {
		timeCounter,
		fomatedTimeCounter: convertMsToTime(timeCounter),
		timerStatusFetching,
		getTimerStatus,
		loading,
		timerStatus,
		firstLoadTimerData,
		startTimer,
		stopTimer,
		hasPlan,
		hasPlanForTomorrow,
		canRunTimer,
		canTrack,
		isPlanVerified,
		firstLoad,
		toggleTimer,
		timerSeconds,
		activeTeamTask,
		syncTimer,
		syncTimerLoading: syncTimerMutation.isPending
	};
}

/**
 * It returns an object with the current time, the current seconds, and the current timer status
 * @returns A function that returns a value.
 */
export function useLiveTimerStatus() {
	const seconds = useAtomValue(timerSecondsState);

	const timerStatus = useAtomValue(timerStatusState);
	const { h, m } = secondsToTime((timerStatus?.duration || 0) + seconds);

	return {
		time: { h, m },
		seconds,
		timerStatus
	};
}

/**
 * It returns the timer's state and the function to start/stop the timer
 */
export function useTimerView() {
	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatus,
		timerStatusFetching,
		startTimer,
		stopTimer,
		hasPlan,
		hasPlanForTomorrow,
		canRunTimer,
		canTrack,
		isPlanVerified,
		timerSeconds,
		activeTeamTask,
		syncTimerLoading
	} = useTimer();

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);

	const timerHanlder = () => {
		if (timerStatusFetching || !canRunTimer) return;
		if (timerStatus?.running) {
			stopTimer();
		} else {
			startTimer();
		}
	};

	return {
		hours,
		minutes,
		seconds,
		ms_p,
		activeTaskEstimation,
		timerHanlder,
		canRunTimer,
		timerStatusFetching,
		timerStatus,
		activeTeamTask,
		hasPlan,
		hasPlanForTomorrow,
		disabled: !canRunTimer,
		canTrack,
		isPlanVerified,
		startTimer,
		stopTimer,
		syncTimerLoading
	};
}

export function useSyncTimer() {
	const { syncTimer } = useTimer();
	const timerStatus = useAtomValue(timerStatusState);

	useRefreshIntervalV2(timerStatus?.running ? syncTimer : () => void 0, 5000);
}
