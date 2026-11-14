/* eslint-disable camelcase */
import { convertMsToTime, secondsToTime } from '../../helpers/date';
import { startTimerRequest, stopTimerRequest, toggleTimerRequest } from '../client/requests/timer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSyncRef } from './use-sync-ref';
import { ILocalTimerStatus, ITimerParams, ITimerStatus, TimerSource } from '../interfaces/ITimer';
import { useFirstLoad } from './use-first-load';
import isEqual from 'lodash/isEqual';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import { translate } from '../../i18n/translate';
import { useStores } from '../../models';
import { ITeamTask } from '../interfaces/ITask';
import { useTeamTasks } from './features/use-team-tasks';
import useFetchTimerStatus from '../client/queries/timer/timer';
import { useTaskStatistics } from './features/use-task-statistics';
import moment from 'moment-timezone';

const LOCAL_TIMER_STORAGE_KEY = 'local-timer-ever-teams';

/**
 * Don't modify this function unless you know what you're doing
 */
function useLocalTimeCounter(timerStatus: ITimerStatus | null, activeTeamTask: ITeamTask | null, firstLoad: boolean) {
	const {
		TimerStore: {
			timeCounterInterval,
			setLocalTimerStatus,
			localTimerStatus,
			timeCounterState,
			timerSecondsState,
			setTimerSecondsState,
			setTimerCounterState
		},
		TaskStore: { statActiveTask }
	} = useStores();

	const activeTaskStat = statActiveTask; // active task statistics status

	// Refs
	const timerStatusRef = useSyncRef(timerStatus);
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
	const timerSecondsRef = useRef(0);
	const seconds = Math.floor(timeCounterState / 1000);

	const updateLocalStorage = useCallback((status: ILocalTimerStatus) => {
		AsyncStorage.setItem(LOCAL_TIMER_STORAGE_KEY, JSON.stringify(status));
	}, []);

	const updateLocalTimerStatus = useCallback((status: ILocalTimerStatus) => {
		updateLocalStorage(status); // the order is important (first update localstorage, then update the store state)
		setLocalTimerStatus(status);
	}, []);

	const getLocalCounterStatus = useCallback(async () => {
		let data: ILocalTimerStatus | null = null;
		try {
			const localCounterStatus = await AsyncStorage.getItem(LOCAL_TIMER_STORAGE_KEY);
			data = JSON.parse(localCounterStatus || 'null');
		} catch (error) {
			console.log(error);
		}
		return data;
	}, []);

	// Update local time status (storage and store) only when global timerStatus changes
	useEffect(() => {
		if (!firstLoad) {
			(async () => {
				const localStatus = await getLocalCounterStatus();
				localStatus && setLocalTimerStatus(localStatus);

				const timerStatusDate = timerStatus?.lastLog?.createdAt
					? moment(timerStatus?.lastLog?.createdAt).unix() * 1000 - timerStatus?.lastLog?.duration
					: 0;

				timerStatus &&
					updateLocalTimerStatus({
						runnedDateTime:
							(timerStatus.running ? timerStatusDate || Date.now() : 0) ||
							localStatus?.runnedDateTime ||
							0,
						running: timerStatus.running,
						lastTaskId: timerStatus.lastLog?.taskId || null
					});
			})();
		}
	}, [firstLoad, timerStatus]);

	// THis is form constant update of the progress line
	timerSecondsRef.current = useMemo(() => {
		if (firstLoad) return 0;
		if (seconds > timerSecondsRef.current) {
			return seconds;
		}
		if (timerStatusRef.current && !timerStatusRef.current.running) {
			return 0;
		}
		return timerSecondsRef.current;
	}, [seconds, activeTaskStat, firstLoad]);

	useEffect(() => {
		if (!firstLoad) {
			timerSecondsRef.current = 0;
			setTimerSecondsState(0);
		}
	}, [activeTeamTask?.id, firstLoad]);

	useEffect(() => {
		if (!firstLoad) {
			setTimerSecondsState(timerSecondsRef.current);
		}
	}, [timerSecondsRef.current, firstLoad]);

	// Time Counter
	useEffect(() => {
		if (firstLoad || !localTimerStatus) return clearInterval(timeCounterIntervalRef.current);
		let timerFuntion;

		if (localTimerStatus.running) {
			timerFuntion = setInterval(() => {
				const now = Date.now();
				setTimerCounterState(now - localTimerStatus.runnedDateTime);
			}, 50);
		} else {
			clearInterval(timerFuntion);
			setTimerCounterState(0);
		}
		return () => clearInterval(timerFuntion);
	}, [localTimerStatus, firstLoad]);

	return {
		updateLocalTimerStatus,
		timeCounterState,
		timerSecondsState
	};
}

/** The stops under way together, and what the screen showed running before the first of them. */
type StopsUnderWay = { count: number; stopped: boolean; failed: boolean; shownAsRunning: ILocalTimerStatus | null };

export function useTimer() {
	const {
		authenticationStore: { tenantId, authToken, organizationId, user },
		TaskStore: { activeTask },
		teamStore: { activeTeamId, activeTeam },
		TimerStore: { timerStatus, setTimerStatusFetching, timerStatusFetchingState, setTimerStatus }
	} = useStores();
	// Read as they are when Stop is pressed, not as they were at a render
	const { authenticationStore: session, TimerStore: timerStore } = useStores();

	const [stopTimerLoading, setStopTimerLoading] = useState(false);

	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad();
	const { updateTask } = useTeamTasks();
	// // const wasRunning = timerStatus?.running || false;
	const timerStatusRef = useSyncRef(timerStatus);
	const taskId = useSyncRef(activeTask?.id);
	const activeTeamTaskRef = useSyncRef(activeTask);
	const activeTeamIdRef = useSyncRef(activeTeamId);
	const lastActiveTeamId = useRef<string | null>(null);
	const lastActiveTaskId = useRef<string | null>(null);
	const canRunTimer = !!activeTask?.id && activeTask.status !== 'Closed';

	// // Local time status
	const { timeCounterState, updateLocalTimerStatus, timerSecondsState } = useLocalTimeCounter(
		timerStatus,
		activeTask,
		firstLoad
	);

	const { isSuccess, data: timerStatusData } = useFetchTimerStatus(
		{
			authToken,
			tenantId,
			organizationId,
			employeeId: user?.employee?.id
		},
		timerStatus?.running,
		timerStatusRef.current?.lastLog?.source ?? TimerSource.MOBILE
	);

	const toggleTimer = useCallback(async (taskId: string) => {
		const response = await toggleTimerRequest(
			{
				logType: 'TRACKED',
				source: TimerSource.MOBILE,
				tags: [],
				taskId,
				tenantId,
				organizationId,
				...(activeTeamIdRef.current ? { organizationTeamId: activeTeamIdRef.current } : {})
			},
			authToken as string
		);
		const status: ITimerStatus = {
			duration: response?.data.duration,
			running: response?.data.isRunning
		};
		setTimerStatus(status);
	}, []);

	useEffect(() => {
		setTimerStatusFetching(stopTimerLoading);
	}, [stopTimerLoading]);

	// Start timer
	const startTimer = useCallback(async () => {
		if (!taskId.current) {
			return {};
		}

		updateLocalTimerStatus({
			lastTaskId: taskId.current,
			runnedDateTime: Date.now(),
			running: true
		});

		setTimerStatusFetching(true);

		const params: ITimerParams = {
			organizationId,
			tenantId,
			taskId: activeTask?.id,
			logType: 'TRACKED',
			source: TimerSource.MOBILE,
			tags: [],
			...(activeTeamIdRef.current ? { organizationTeamId: activeTeamIdRef.current } : {})
		};

		const { data } = await startTimerRequest(params, authToken as string);

		const status: ITimerStatus = {
			duration: data?.duration,
			running: data?.isRunning,
			lastLog: data
		};
		setTimerStatus(status);
		setTimerStatusFetching(false);

		/**
		 *  Updating the task status to "In Progress" when the timer is started.
		 */
		if (activeTeamTaskRef.current && activeTeamTaskRef.current.status !== 'in-progress') {
			updateTask(
				{
					...activeTeamTaskRef.current,
					status: 'in-progress'
				},
				taskId.current
			);
		}

		return data;
	}, [taskId.current]);

	// The stops under way together (the team and the task changed at once) settle as one: the screen shows the timer
	// running again only when none of them stopped it, with what it showed before the first
	const stopsUnderWay = useRef<StopsUnderWay>({ count: 0, stopped: false, failed: false, shownAsRunning: null });

	/** The last of the stops under way has settled: when none of them stopped the timer, it is shown running again. */
	const settleStops = (stops: StopsUnderWay) => {
		setStopTimerLoading(false);
		// Unless the session ended with a stop: the person is signed out, and was told that
		if (!stops.failed || stops.stopped || !session.isAuthenticated) {
			return;
		}
		if (stops.shownAsRunning) {
			updateLocalTimerStatus(stops.shownAsRunning);
		}
		showMessage({
			message: translate('timer.stopFailedTitle'),
			description: translate('timer.stopFailedMessage'),
			type: 'danger'
		});
	};

	// Stop timer
	const stopTimer = useCallback(async () => {
		if (stopsUnderWay.current.count === 0) {
			// What the screen shows until now, put back if the API does not stop the timer
			const shown: ILocalTimerStatus | null = timerStore.localTimerStatus;
			stopsUnderWay.current = {
				count: 0,
				stopped: false,
				failed: false,
				shownAsRunning: shown?.running ? shown : null
			};
		}
		const stops = stopsUnderWay.current;
		stops.count += 1;
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false
		});

		const params: ITimerParams = {
			organizationId,
			tenantId,
			taskId: activeTask?.id,
			logType: 'TRACKED',
			source: timerStatusRef.current?.lastLog?.source || TimerSource.MOBILE,
			tags: []
		};

		setStopTimerLoading(true);

		try {
			const { data, response } = await stopTimerRequest(params, authToken as string);

			// Nothing was running anymore: the timer was stopped from another device. The screen is right to show it
			// stopped, and its status says the same until the next read
			if (response.status === 406) {
				stops.stopped = true;
				setTimerStatus({ ...timerStore.timerStatus, running: false });
				return;
			}
			// The API did not stop the timer, which goes on there. The body of a refusal is not a timer: read as one,
			// it showed the timer stopped. The screen shows it running again instead, and the person is told (below).
			if (!response.ok) {
				stops.failed = true;
				return;
			}

			stops.stopped = true;
			const status: ITimerStatus = {
				duration: data.duration,
				running: data.isRunning,
				lastLog: data
			};
			setTimerStatus(status);
		} catch {
			// The stop never reached the API (no network): the timer goes on there, as for a refusal
			stops.failed = true;
		} finally {
			stops.count -= 1;
			if (stops.count === 0) {
				settleStops(stops);
			}
		}
	}, [taskId.current]);

	// If active team changes then stop the timer
	useEffect(() => {
		if (
			lastActiveTeamId.current !== null &&
			activeTeamId !== lastActiveTeamId.current &&
			!firstLoad &&
			timerStatusRef.current?.running
		) {
			stopTimer();
		}
		if (activeTeamId) {
			lastActiveTeamId.current = activeTeamId;
		}
	}, [firstLoad, activeTeamId, activeTeam]);

	// If active task changes then stop the timer
	useEffect(() => {
		const taskId = activeTask?.id;
		if (
			lastActiveTaskId.current !== null &&
			taskId !== lastActiveTaskId.current &&
			!firstLoad &&
			timerStatusRef.current?.running
		) {
			stopTimer();
		}
		if (taskId) {
			lastActiveTaskId.current = taskId;
		}
	}, [firstLoad, activeTask?.id]);

	useEffect(() => {
		if (isSuccess) {
			if (!isEqual(timerStatus, timerStatusData)) {
				setTimerStatus(timerStatusData);
			}
		}
	}, [timerStatusData]);

	return {
		fomatedTimeCounter: convertMsToTime(timeCounterState),
		timerStatusFetchingState,
		timerStatus,
		firstLoadTimerData,
		startTimer,
		stopTimer,
		canRunTimer,
		firstLoad,
		toggleTimer,
		timerSecondsState,
		activeTeamTask: activeTask
	};
}

/**
 * It returns an object with the current time, the current seconds, and the current timer status
 * @returns A function that returns a value.
 */
export function useLiveTimerStatus() {
	const {
		TimerStore: { timerSecondsState: seconds, timerStatus }
	} = useStores();

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
		timerStatusFetchingState,
		startTimer,
		stopTimer,
		canRunTimer,
		timerSecondsState,
		activeTeamTask
	} = useTimer();

	const { activeTaskEstimation } = useTaskStatistics(timerSecondsState);

	const timerHanlder = () => {
		if (timerStatusFetchingState || !canRunTimer) return;
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
		timerStatusFetchingState,
		timerStatus,
		activeTeamTask,
		disabled: !canRunTimer,
		startTimer,
		stopTimer
	};
}
