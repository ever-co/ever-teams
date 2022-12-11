import { convertMsToTime } from '@app/helpers/date';
import { ITeamTask } from '@app/interfaces/ITask';
import { ILocalTimerStatus, ITimerStatus } from '@app/interfaces/ITimer';
import {
	getTimerStatusAPI,
	startTimerAPI,
	stopTimerAPI,
	toggleTimerAPI,
} from '@app/services/client/api/timer';
import {
	activeTaskStatisticsState,
	activeTeamIdState,
	activeTeamTaskState,
	localTimerStatusState,
	timeCounterIntervalState,
	timeCounterState,
	timerSecondsState,
	timerStatusFetchingState,
	timerStatusState,
} from '@app/stores';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';

const LOCAL_TIMER_STORAGE_KEY = 'local-timer-gauzy-team';

/**
 * Don't modify this function unless you know what you're doing
 */
function useLocalTimeCounter(
	timerStatus: ITimerStatus | null,
	activeTeamTask: ITeamTask | null,
	firstLoad: boolean
) {
	const [timeCounterInterval, setTimeCounterInterval] = useRecoilState(
		timeCounterIntervalState
	);
	const [localTimerStatus, setLocalTimerStatus] = useRecoilState(
		localTimerStatusState
	);

	const [timeCounter, setTimeCounter] = useRecoilState(timeCounterState); // in millisencods
	const [timerSeconds, setTimerSeconds] = useRecoilState(timerSecondsState);
	const activeTaskStat = useRecoilValue(activeTaskStatisticsState); // active task statistics status

	// Refs
	const timerStatusRef = useSyncRef(timerStatus);
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
	const timerSecondsRef = useRef(0);
	const seconds = Math.floor(timeCounter / 1000);

	const updateLocalStorage = useCallback((status: ILocalTimerStatus) => {
		localStorage.setItem(LOCAL_TIMER_STORAGE_KEY, JSON.stringify(status));
	}, []);

	const updateLocalTimerStatus = useCallback((status: ILocalTimerStatus) => {
		updateLocalStorage(status); // the order is important (first update localstorage, then update the store state)
		setLocalTimerStatus(status);
	}, []);

	const getLocalCounterStatus = useCallback(() => {
		let data: ILocalTimerStatus | null = null;
		try {
			data = JSON.parse(
				localStorage.getItem(LOCAL_TIMER_STORAGE_KEY) || 'null'
			);
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

			timerStatus &&
				updateLocalTimerStatus({
					runnedDateTime: localStatus?.runnedDateTime || 0,
					running: timerStatus.running,
					lastTaskId: timerStatus.lastLog?.taskId || null,
				});
		}
	}, [firstLoad, timerStatus]);

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
	}, [seconds, activeTaskStat, firstLoad]);

	useEffect(() => {
		if (firstLoad) {
			timerSecondsRef.current = 0;
			setTimerSeconds(0);
		}
	}, [activeTeamTask?.id, firstLoad]);

	useEffect(() => {
		if (firstLoad) {
			setTimerSeconds(timerSecondsRef.current);
		}
	}, [timerSecondsRef.current, firstLoad]);

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
	}, [localTimerStatus, firstLoad]);

	return {
		updateLocalTimerStatus,
		timeCounter,
		timerSeconds: timerSeconds,
	};
}

export function useTimer() {
	const activeTeamTask = useRecoilValue(activeTeamTaskState);
	const activeTeamId = useRecoilValue(activeTeamIdState);
	const [timerStatus, setTimerStatus] = useRecoilState(timerStatusState);

	const [timerStatusFetching, setTimerStatusFetching] = useRecoilState(
		timerStatusFetchingState
	);

	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad();

	// Queries
	const { queryCall, loading } = useQuery(getTimerStatusAPI);
	const { queryCall: toggleQueryCall } = useQuery(toggleTimerAPI);
	const { queryCall: startTimerQueryCall } = useQuery(startTimerAPI);
	const { queryCall: stopTimerQueryCall, loading: stopTimerLoading } =
		useQuery(stopTimerAPI);

	// const wasRunning = timerStatus?.running || false;
	const timerStatusRef = useSyncRef(timerStatus);
	const taskId = useSyncRef(activeTeamTask?.id);
	const lastActiveTeamId = useRef<string | null>(null);
	const lastActiveTaskId = useRef<string | null>(null);
	const canRunTimer = !!activeTeamTask && activeTeamTask.status !== 'Closed';

	// Local time status
	const { timeCounter, updateLocalTimerStatus, timerSeconds } =
		useLocalTimeCounter(timerStatus, activeTeamTask, firstLoad);

	const getTimerStatus = useCallback(() => {
		return queryCall().then((res) => {
			if (res.data) {
				setTimerStatus(res.data);
			}
			return res;
		});
	}, []);

	const toggleTimer = useCallback((taskId: string, updateStore = true) => {
		return toggleQueryCall({
			taskId,
		}).then((res) => {
			if (updateStore && res.data) {
				setTimerStatus(res.data);
			}
			return res;
		});
	}, []);

	// Loading states
	useEffect(() => {
		if (firstLoad) {
			setTimerStatusFetching(loading);
		}
	}, [loading, firstLoad]);

	useEffect(() => {
		setTimerStatusFetching(stopTimerLoading);
	}, [stopTimerLoading]);

	// Start timer
	const startTimer = useCallback(async () => {
		if (!taskId.current) return;
		updateLocalTimerStatus({
			lastTaskId: taskId.current,
			runnedDateTime: Date.now(),
			running: true,
		});

		setTimerStatusFetching(true);
		const promise = startTimerQueryCall().then((res) => {
			res.data && setTimerStatus(res.data);
			return;
		});

		promise.finally(() => setTimerStatusFetching(false));

		return promise;
	}, [taskId.current]);

	// Stop timer
	const stopTimer = useCallback(() => {
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false,
		});
		stopTimerQueryCall().then((res) => {
			res.data && setTimerStatus(res.data);
		});
	}, [taskId.current]);

	// If active team changes then stop the timer
	useEffect(() => {
		if (
			lastActiveTeamId.current !== null &&
			activeTeamId !== lastActiveTeamId.current &&
			firstLoad &&
			timerStatusRef.current?.running
		) {
			stopTimer();
		}
		if (activeTeamId) {
			lastActiveTeamId.current = activeTeamId;
		}
	}, [firstLoad, activeTeamId]);

	// If active task changes then stop the timer
	useEffect(() => {
		const taskId = activeTeamTask?.id;
		if (
			lastActiveTaskId.current !== null &&
			taskId !== lastActiveTaskId.current &&
			firstLoad &&
			timerStatusRef.current?.running
		) {
			stopTimer();
		}
		if (taskId) {
			lastActiveTaskId.current = taskId;
		}
	}, [firstLoad, activeTeamTask?.id]);

	// Automaticaly change timer status when active task changes
	// ---------- (Actually it unessecary since start and stop function can modify the timer status)
	/**
		useEffect(() => {
			const canToggle =
				activeTeamTask &&
				timerTaskId.current !== activeTeamTask.id &&
				firstLoad &&
				wasRunning;

			if (canToggle) {
				setTimerStatusFetching(true);
				toggleTimer(activeTeamTask.id).finally(() => {
					setTimerStatusFetching(false);
				});
			}
		}, [activeTeamTask?.id, firstLoad, wasRunning]);
	**/

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
		canRunTimer,
		firstLoad,
		toggleTimer,
		timerSeconds,
	};
}
