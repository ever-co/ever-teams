/* eslint-disable camelcase */
import { convertMsToTime, secondsToTime } from '../../helpers/date';
import { startTimerRequest, stopTimerRequest, syncTimeSlotRequest, toggleTimerRequest } from '../client/requests/timer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSyncRef } from './use-sync-ref';
import { ILocalTimerStatus, ITimer, ITimerParams, ITimerStatus, TimerSource } from '../interfaces/ITimer';
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
import { runStartOf } from '../../helpers/timer-run-start';
import { countTimeFrom } from './shared-time-counter';
import { observer } from 'mobx-react-lite';
import { runningTimeWriter } from './running-time-writer';

const LOCAL_TIMER_STORAGE_KEY = 'local-timer-ever-teams';

/** Saves the timer's local status on the phone, then in the store; the order matters. */
function useUpdateLocalTimerStatus() {
	const {
		TimerStore: { setLocalTimerStatus }
	} = useStores();
	return useCallback(
		(status: ILocalTimerStatus) => {
			AsyncStorage.setItem(LOCAL_TIMER_STORAGE_KEY, JSON.stringify(status));
			setLocalTimerStatus(status);
		},
		[setLocalTimerStatus]
	);
}

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

	const updateLocalTimerStatus = useUpdateLocalTimerStatus();

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

				// The run's start, which a start moved on the web or on the phone changes; an API whose status names no
				// start leaves the clock counting from the entry's creation, as before
				const createdAtStart = timerStatus?.lastLog?.createdAt
					? moment(timerStatus?.lastLog?.createdAt).unix() * 1000 - timerStatus?.lastLog?.duration
					: 0;
				const timerStatusDate = runStartOf(timerStatus) ?? createdAtStart;

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

	// The run's start moved, here or on another device: the count taken then is still the old start's, so the next
	// count is taken as it is, and the worked seconds can shrink with the clock
	const runStartedAt = localTimerStatus?.runnedDateTime;
	const countedRunStart = useRef(runStartedAt);
	const countOfOldStart = useRef<number | null>(null);
	if (countedRunStart.current !== runStartedAt) {
		countedRunStart.current = runStartedAt;
		countOfOldStart.current = seconds;
	}

	// THis is form constant update of the progress line
	timerSecondsRef.current = useMemo(() => {
		if (firstLoad) return 0;
		const countsFromMovedStart = countOfOldStart.current !== null && seconds !== countOfOldStart.current;
		if (countsFromMovedStart) {
			countOfOldStart.current = null;
			return seconds;
		}
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
		if (localTimerStatus.running) {
			return countTimeFrom(localTimerStatus.runnedDateTime, setTimerCounterState);
		}
		setTimerCounterState(0);
		return undefined;
	}, [localTimerStatus, firstLoad]);

	return {
		updateLocalTimerStatus,
		timeCounterState,
		timerSecondsState
	};
}

/**
 * Counts the running time for the whole app. Each component calling useTimer used to run this count itself and read
 * the time as it went by, so all of them rendered again 20 times a second while the timer ran: about twenty on the
 * Team tab. It runs once now, in the signed-in part of the app, and only the components that show the time read it.
 */
export const TimeCounterHost = observer(function TimeCounterHost() {
	const {
		TaskStore: { activeTask },
		TimerStore: { timerStatus }
	} = useStores();
	const { firstLoad } = useFirstLoad();
	useLocalTimeCounter(timerStatus, activeTask, firstLoad);
	return null;
});

/** The stops under way together, and what the screen showed running before the first of them. */
type StopsUnderWay = { count: number; stopped: boolean; failed: boolean; shownAsRunning: ILocalTimerStatus | null };

/** How long a stop waits for the other writer's last write before it is sent anyway. */
export const WRITE_BEFORE_STOP_MS = 5_000;

/** Waits for the work, at most that long: what it does after does not hold the caller back, and it never rejects. */
function atMost(ms: number, work: Promise<void>): Promise<void> {
	let bound: ReturnType<typeof setTimeout> | undefined;
	const timeUp = new Promise<void>((resolve) => {
		bound = setTimeout(resolve, ms);
	});
	return Promise.race([work.catch(() => undefined), timeUp]).finally(() => clearTimeout(bound));
}

/** Tells the other writer of the running time, if one is registered, that the API started or stopped the timer. */
function tellTimerChanged(log: ITimer | undefined): void {
	const writer = runningTimeWriter();
	if (!writer) {
		return;
	}
	if (log?.isRunning) {
		writer.afterStart(log);
		return;
	}
	// a toggle that stopped the timer answers with the run it stopped
	writer.afterStop(log);
}

/** Writes seconds of the running timer as a time slot: rejects when the API did not write them. */
async function writeTimeSlot(
	params: ITimerParams,
	employeeId: string | undefined,
	authToken: string | undefined,
	seconds: number
): Promise<void> {
	if (!employeeId || !authToken) {
		throw new Error('No employee to write the running time for');
	}
	const { response } = await syncTimeSlotRequest(
		{
			tenantId: params.tenantId,
			organizationId: params.organizationId,
			employeeId,
			source: params.source,
			duration: seconds,
			logType: 'TRACKED'
		},
		authToken
	);
	if (!response.ok) {
		throw new Error(`The API did not write the running time: ${response.status}`);
	}
}

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
	const updateLocalTimerStatus = useUpdateLocalTimerStatus();

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
	// The API said what runs, this session: until then the status is the one saved by the last session
	const statusReadRef = useSyncRef(isSuccess);

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
		tellTimerChanged(response?.data);
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
		tellTimerChanged(data);

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
		const otherWriter = runningTimeWriter();
		const runToStop = timerStatusRef.current?.lastLog;
		let stopped = false;

		try {
			// Where another writer writes the running time, the time since its last write goes first, as its own stop does.
			// A write that hangs never holds the stop back: after WRITE_BEFORE_STOP_MS the stop is sent anyway
			if (otherWriter) {
				await atMost(
					WRITE_BEFORE_STOP_MS,
					otherWriter.beforeStop(runToStop, (seconds) =>
						writeTimeSlot(params, session.user?.employee?.id, authToken, seconds)
					)
				);
			}
			const { data, response } = await stopTimerRequest(params, authToken as string);

			// Nothing was running anymore: the timer was stopped from another device. The screen is right to show it
			// stopped, and its status says the same until the next read
			if (response.status === 406) {
				stops.stopped = true;
				stopped = true;
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
			stopped = true;
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
			// a stop that failed leaves the run to the other writer, which goes on writing it
			otherWriter?.afterStop(stopped ? runToStop : undefined);
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

	// If active task changes then stop the timer. Not when the app only takes up the task the timer runs on: at launch
	// the team's task sync names it after the person's card or the last session's state named another, and a timer
	// started on another device runs on the task the team names. Nor before the API said what runs: the saved status
	// can name a run that ended on another device since
	useEffect(() => {
		const taskId = activeTask?.id;
		const status = timerStatusRef.current;
		const takesUpRunningTask = !!taskId && taskId === status?.lastLog?.taskId;
		if (
			lastActiveTaskId.current !== null &&
			taskId !== lastActiveTaskId.current &&
			!firstLoad &&
			statusReadRef.current &&
			status?.running &&
			!takesUpRunningTask
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
		// read only by the components that show the time, so the others do not render again on each tick
		get fomatedTimeCounter() {
			return convertMsToTime(timerStore.timeCounterState);
		},
		timerStatusFetchingState,
		timerStatus,
		firstLoadTimerData,
		startTimer,
		stopTimer,
		canRunTimer,
		firstLoad,
		toggleTimer,
		get timerSecondsState() {
			return timerStore.timerSecondsState;
		},
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
