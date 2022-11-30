import { convertMsToTime } from '@app/helpers/date';
import {
	getTimerStatusAPI,
	startTimerAPI,
	stopTimerAPI,
	toggleTimerAPI,
} from '@app/services/client/api/timer';
import {
	activeTeamIdState,
	activeTeamTaskState,
	timeCounterIntervalState,
	timeCounterState,
	timerStatusFetchingState,
	timerStatusState,
} from '@app/stores';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useQuery } from './useQuery';
import { useSyncRef } from './useSyncRef';

export function useTimer() {
	const activeTeamTask = useRecoilValue(activeTeamTaskState);
	const activeTeamId = useRecoilValue(activeTeamIdState);
	const [timerStatus, setTimerStatus] = useRecoilState(timerStatusState);
	const [timeCounter, setTimeCounter] = useRecoilState(timeCounterState);
	const [firstLoad, setFirstLoad] = useState(false);
	const [timerStatusFetching, setTimerStatusFetching] = useRecoilState(
		timerStatusFetchingState
	);
	const [timeCounterInterval, setTimeCounterInterval] = useRecoilState(
		timeCounterIntervalState
	);

	// Queries
	const { queryCall, loading } = useQuery(getTimerStatusAPI);
	const { queryCall: toggleQueryCall } = useQuery(toggleTimerAPI);
	const { queryCall: startTimerQueryCall } = useQuery(startTimerAPI);
	const { queryCall: stopTimerQueryCall, loading: stopTimerLoading } =
		useQuery(stopTimerAPI);

	const wasRunning = timerStatus?.running || false;
	const timerTaskId = useSyncRef(timerStatus?.lastLog?.taskId);
	const timerStatusRef = useSyncRef(timerStatus);
	const taskId = useSyncRef(activeTeamTask?.id);
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
	const lastActiveTeamId = useRef<string | null>(null);
	const canRunTimer = !!activeTeamTask && activeTeamTask.status !== 'Closed';

	/**
	 * To be called once, at the top level component (e.g main.tsx)
	 */
	const firstLoadTimerData = useCallback(() => {
		setFirstLoad(true);
	}, []);

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
		setTimerStatusFetching(true);
		if (!taskId.current) return;
		if (taskId.current !== timerTaskId.current) {
			await toggleTimer(taskId.current, false);
		}
		const promise = startTimerQueryCall().then((res) => {
			res.data && setTimerStatus(res.data);
			return;
		});

		promise.finally(() => setTimerStatusFetching(false));

		return promise;
	}, [timerTaskId.current, taskId.current]);

	// Stop timer
	const stopTimer = useCallback(() => {
		window.clearInterval(timeCounterIntervalRef.current);
		stopTimerQueryCall().then((res) => {
			res.data && setTimerStatus(res.data);
		});
	}, []);

	// If active team change then stope the timer
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
	}, [activeTeamId]);

	// Time Counter
	useEffect(() => {
		if (!firstLoad || !timerStatus) return;
		window.clearInterval(timeCounterIntervalRef.current);
		setTimeCounter(timerStatus.duration * 1000);
		if (timerStatus.running) {
			const INTERVAL = 50; // MS
			setTimeCounterInterval(
				window.setInterval(() => {
					setTimeCounter((c) => c + INTERVAL);
				}, INTERVAL)
			);
		}
	}, [timerStatus, firstLoad]);

	// Automaticaly change timer status when active task changes
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
	};
}
