/* eslint-disable no-mixed-spaces-and-tabs */
import { convertMsToTime, secondsToTime } from '@app/helpers/date';
import { ITeamTask } from '@app/interfaces/ITask';
import {
	ILocalTimerStatus,
	ITimerStatus,
	TimerSource,
} from '@app/interfaces/ITimer';
import {
	getTimerStatusAPI,
	startTimerAPI,
	stopTimerAPI,
	toggleTimerAPI,
	syncTimerAPI,
} from '@app/services/client/api/timer';
import {
	activeTaskStatisticsState,
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
import { useRefreshInterval } from './useRefreshInterval';
import { useTaskStatistics } from './useTaskStatistics';
import { useTeamTasks } from './useTeamTasks';
import isEqual from 'lodash/isEqual';
import { useOrganizationEmployeeTeams } from './useOrganizatioTeamsEmployee';
import { useAuthenticateUser } from './useAuthenticateUser';
import moment from 'moment';

const LOCAL_TIMER_STORAGE_KEY = 'local-timer-ever-team';

/**
 * ! Don't modify this function unless you know what you're doing
 * "This function is used to update the local timer status and time counter."
 *
 * The function is used in the `Timer` component
 * @param {ITimerStatus | null} timerStatus - ITimerStatus | null,
 * @param {ITeamTask | null} activeTeamTask - ITeamTask | null - the current active task
 * @param {boolean} firstLoad - boolean - this is a flag that indicates that the component is loaded
 * for the first time.
 * @returns An object with the following properties:
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

			const timerStatusDate = timerStatus?.lastLog?.createdAt
				? moment(timerStatus?.lastLog?.createdAt).unix() * 1000 -
				  timerStatus?.lastLog?.duration
				: 0;

			timerStatus &&
				updateLocalTimerStatus({
					runnedDateTime:
						(timerStatus.running ? timerStatusDate || Date.now() : 0) ||
						localStatus?.runnedDateTime ||
						0,
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

/**
 * It returns a bunch of data and functions related to the timer
 */
export function useTimer() {
	const { updateTask, activeTeamId, activeTeam, activeTeamTask } =
		useTeamTasks();
	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const { user } = useAuthenticateUser();

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
	const { queryCall: syncTimerQueryCall, loading: syncTimerLoading } =
		useQuery(syncTimerAPI);

	// const wasRunning = timerStatus?.running || false;
	const timerStatusRef = useSyncRef(timerStatus);
	const taskId = useSyncRef(activeTeamTask?.id);
	const activeTeamTaskRef = useSyncRef(activeTeamTask);
	const lastActiveTeamId = useRef<string | null>(null);
	const lastActiveTaskId = useRef<string | null>(null);
	const canRunTimer = !!activeTeamTask && activeTeamTask.status !== 'closed';
	const syncTimerInterval = useRef<NodeJS.Timer | null>(null);

	// Local time status
	const { timeCounter, updateLocalTimerStatus, timerSeconds } =
		useLocalTimeCounter(timerStatus, activeTeamTask, firstLoad);

	const getTimerStatus = useCallback(
		(deepCheck?: boolean) => {
			return queryCall().then((res) => {
				if (res.data && !isEqual(timerStatus, res.data)) {
					setTimerStatus((t) => {
						if (deepCheck) {
							return res.data.running !== t?.running ? res.data : t;
						}
						return res.data;
					});
				}
				return res;
			});
		},
		[timerStatus]
	);

	const toggleTimer = useCallback(
		(taskId: string, updateStore = true) => {
			return toggleQueryCall({
				taskId,
			}).then((res) => {
				if (updateStore && res.data && !isEqual(timerStatus, res.data)) {
					setTimerStatus(res.data);
				}
				return res;
			});
		},
		[timerStatus]
	);

	const syncTimer = useCallback(() => {
		if (syncTimerLoading) {
			return;
		}
		return syncTimerQueryCall(
			timerStatus?.lastLog?.source || TimerSource.BROWSER
		).then((res) => {
			return res;
		});
	}, [syncTimerQueryCall, timerStatus, syncTimerLoading]);

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
			res.data && !isEqual(timerStatus, res.data) && setTimerStatus(res.data);
			return;
		});

		/**
		 *  Updating the task status to "In Progress" when the timer is started.
		 */
		if (
			activeTeamTaskRef.current &&
			activeTeamTaskRef.current.status !== 'in-progress'
		) {
			updateTask({
				...activeTeamTaskRef.current,
				status: 'in-progress',
			});
		}

		if (activeTeamTaskRef.current) {
			// Update Current user's active task to sync across multiple devices
			const currentEmployeeDetails = activeTeam?.members.find(
				(member) => member.employeeId === user?.employee.id
			);
			if (currentEmployeeDetails && currentEmployeeDetails.id) {
				updateOrganizationTeamEmployee(currentEmployeeDetails.id, {
					organizationId: activeTeamTaskRef.current.organizationId,
					activeTaskId: activeTeamTaskRef.current.id,
					organizationTeamId: activeTeam?.id,
					tenantId: activeTeam?.tenantId,
				});
			}
		}

		promise.finally(() => setTimerStatusFetching(false));

		return promise;
	}, [
		taskId.current,
		activeTeamTaskRef,
		timerStatus,
		updateOrganizationTeamEmployee,
		user,
		activeTeam,
		setTimerStatus,
		setTimerStatusFetching,
		startTimerQueryCall,
		taskId,
		updateLocalTimerStatus,
		updateTask,
	]);

	// Stop timer
	const stopTimer = useCallback(() => {
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false,
		});

		return stopTimerQueryCall(
			timerStatus?.lastLog?.source || TimerSource.BROWSER
		).then((res) => {
			res.data && !isEqual(timerStatus, res.data) && setTimerStatus(res.data);
		});
	}, [taskId.current, syncTimerInterval.current, timerStatus]);

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
		const canStop =
			lastActiveTaskId.current !== null &&
			taskId !== lastActiveTaskId.current &&
			firstLoad;

		if (canStop && timerStatusRef.current?.running) {
			stopTimer();
		}

		// if (canStop && taskId) {
		// 	toggleTimer(taskId);
		// }

		if (taskId) {
			lastActiveTaskId.current = taskId;
		}
	}, [firstLoad, activeTeamTask?.id]);

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
		activeTeamTask,
		syncTimer,
		syncTimerLoading,
	};
}

/**
 * It returns an object with the current time, the current seconds, and the current timer status
 * @returns A function that returns a value.
 */
export function useLiveTimerStatus() {
	const seconds = useRecoilValue(timerSecondsState);

	const timerStatus = useRecoilValue(timerStatusState);
	const { h, m } = secondsToTime((timerStatus?.duration || 0) + seconds);

	return {
		time: { h, m },
		seconds,
		timerStatus,
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
		canRunTimer,
		timerSeconds,
		activeTeamTask,
		syncTimerLoading,
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
		disabled: !canRunTimer,
		startTimer,
		stopTimer,
		syncTimerLoading,
	};
}

export function useSyncTimer() {
	const { syncTimer } = useTimer();
	const timerStatus = useRecoilValue(timerStatusState);

	useRefreshInterval(timerStatus?.running ? syncTimer : () => void 0, 5000);
}
