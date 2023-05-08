import { convertMsToTime, secondsToTime } from "../../helpers/date"
import {
	startTimerRequest,
	stopTimerRequest,
	getTimerStatusRequest,
	toggleTimerRequest,
} from "../client/requests/timer"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSyncRef } from "./useSyncRef"
import { ILocalTimerStatus, ITimerParams, ITimerStatus } from "../interfaces/ITimer"
import { useFirstLoad } from "./useFirstLoad"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useStores } from "../../models"
import { ITeamTask } from "../interfaces/ITask"
import { useTeamTasks } from "./features/useTeamTasks"
import useFetchTimerStatus from "../client/queries/timer/timer"

const LOCAL_TIMER_STORAGE_KEY = "local-timer-gauzy-teams"

/**
 * Don't modify this function unless you know what you're doing
 */
function useLocalTimeCounter(
	timerStatus: ITimerStatus | null,
	activeTeamTask: ITeamTask | null,
	firstLoad: boolean,
) {
	const {
		TimerStore: {
			timeCounterInterval,
			setTimerCounterIntervalState,
			setLocalTimerStatus,
			localTimerStatus,
			timeCounterState,
			setTimerCounterState,
			setTimerSecondsState,
			timerSecondsState,
		},
		TaskStore: { activeTask, activeTaskStaticts },
	} = useStores()

	// Refs
	const timerStatusRef = useSyncRef(timerStatus)
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval)
	const timerSecondsRef = useRef(timerSecondsState)
	const seconds = Math.floor(timeCounterState / 1000)

	const updateLocalStorage = useCallback((status: ILocalTimerStatus) => {
		AsyncStorage.setItem(LOCAL_TIMER_STORAGE_KEY, JSON.stringify(status))
	}, [])

	const updateLocalTimerStatus = useCallback((status: ILocalTimerStatus) => {
		updateLocalStorage(status) // the order is important (first update localstorage, then update the store state)
		setLocalTimerStatus(status)
	}, [])

	const getLocalCounterStatus = useCallback(async () => {
		let data: ILocalTimerStatus | null = null
		try {
			const localCounterStatus = await AsyncStorage.getItem(LOCAL_TIMER_STORAGE_KEY)
			data = JSON.parse(localCounterStatus || "null")
		} catch (error) {
			console.log(error)
		}
		return data
	}, [])

	// // Update local time status (storage and store) only when global timerStatus changes
	useEffect(() => {
		if (firstLoad) {
			;(async () => {
				const localStatus = await getLocalCounterStatus()
				localStatus && setLocalTimerStatus(localStatus)

				timerStatus &&
					updateLocalTimerStatus({
						runnedDateTime: localStatus?.runnedDateTime || (timerStatus.running ? Date.now() : 0),
						running: timerStatus.running,
						lastTaskId: timerStatus.lastLog?.taskId || null,
					})
			})()
		}
	}, [firstLoad, timerStatus])

	// // This is form constant update of the progress line
	timerSecondsRef.current = useMemo(() => {
		if (!firstLoad) return 0
		if (seconds > timerSecondsRef.current) {
			return seconds
		}
		if (timerStatusRef.current && !timerStatusRef.current.running) {
			return 0
		}
		return timerSecondsRef.current
	}, [seconds, activeTaskStaticts, firstLoad])

	useEffect(() => {
		if (firstLoad) {
			timerSecondsRef.current = 0
			setTimerSecondsState(0)
		}
	}, [activeTeamTask?.id, firstLoad])

	useEffect(() => {
		if (firstLoad) {
			setTimerSecondsState(timerSecondsRef.current)
		}
	}, [timerSecondsRef.current, firstLoad])

	// Time Counter
	useEffect(() => {
		if (firstLoad || !localTimerStatus) return
		clearInterval(timeCounterIntervalRef.current)
		let timerFuntion

		if (localTimerStatus.running) {
			setTimerCounterIntervalState(
				(timerFuntion = setInterval(() => {
					const now = Date.now()
					setTimerCounterState(now - localTimerStatus.runnedDateTime)
				}, 50)),
			)
		} else {
			clearInterval(timerFuntion)
			setTimerCounterState(0)
		}
		return () => clearInterval(timerFuntion)
	}, [localTimerStatus.running, firstLoad])

	return {
		updateLocalTimerStatus,
		timeCounterState,
		timerSecondsState,
	}
}

export function useTimer() {
	const {
		authenticationStore: { tenantId, authToken, organizationId },
		TaskStore: { activeTask },
		teamStore: { activeTeamId, activeTeam },
		TimerStore: { timerStatus, setTimerStatusFetching, timerStatusFetchingState, setTimerStatus },
	} = useStores()

	const [loading, setLoading] = useState(false)
	const [stopTimerLoading, setStopTimerLoading] = useState(false)

	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad()
	const { updateTask } = useTeamTasks()
	// const wasRunning = timerStatus?.running || false;
	const timerStatusRef = useSyncRef(timerStatus)
	const taskId = useSyncRef(activeTask?.id)
	const activeTeamTaskRef = useSyncRef(activeTask)
	const lastActiveTeamId = useRef<string | null>(null)
	const lastActiveTaskId = useRef<string | null>(null)
	const canRunTimer = !!activeTask?.id && activeTask.status !== "Closed"

	// Local time status
	const { timeCounterState, updateLocalTimerStatus, timerSeconds } = useLocalTimeCounter(
		timerStatus,
		activeTask,
		firstLoad,
	)

	const {
		isLoading,
		isSuccess,
		isRefetching,
		data: timerStatusData,
	} = useFetchTimerStatus({
		authToken,
		tenantId,
		organizationId,
	})
	// const getTimerStatus = useCallback(async () => {
	// 	const response = await getTimerStatusRequest(
	// 		{ source: "BROWSER", tenantId, organizationId },
	// 		authToken,
	// 	)
	// 	setTimerStatus(response.data)
	// 	return response
	// }, [])

	const toggleTimer = useCallback(async (taskId: string, updateStore = true) => {
		const response = await toggleTimerRequest(
			{
				logType: "TRACKED",
				source: "BROWSER",
				tags: [],
				taskId: activeTask?.id,
				tenantId,
				organizationId,
			},
			authToken,
		)
		const status: ITimerStatus = {
			duration: response?.data.duration,
			running: response?.data.isRunning,
		}
		setTimerStatus(status)
	}, [])

	// Loading states
	useEffect(() => {
		if (firstLoad) {
			setTimerStatusFetching(loading)
		}
	}, [loading, firstLoad])

	useEffect(() => {
		setTimerStatusFetching(stopTimerLoading)
	}, [stopTimerLoading])

	// Start timer
	const startTimer = useCallback(async () => {
		if (!taskId.current) {
			return {}
		}

		updateLocalTimerStatus({
			lastTaskId: taskId.current,
			runnedDateTime: Date.now(),
			running: true,
		})

		setTimerStatusFetching(true)

		const params: ITimerParams = {
			organizationId,
			tenantId,
			taskId: activeTask?.id,
			logType: "TRACKED",
			source: "BROWSER",
			tags: [],
		}

		const response = await startTimerRequest(params, authToken)

		const status: ITimerStatus = {
			duration: response?.data.duration,
			running: response?.data.isRunning,
		}
		setTimerStatus(status)
		setTimerStatusFetching(false)

		/**
		 *  Updating the task status to "In Progress" when the timer is started.
		 */
		if (activeTeamTaskRef.current && activeTeamTaskRef.current.status !== "in progress") {
			updateTask(
				{
					...activeTeamTaskRef.current,
					status: "in progress",
				},
				taskId.current,
			)
		}

		return response
	}, [taskId.current])

	// Stop timer
	const stopTimer = useCallback(async () => {
		updateLocalTimerStatus({
			lastTaskId: taskId.current || null,
			runnedDateTime: 0,
			running: false,
		})

		const params: ITimerParams = {
			organizationId,
			tenantId,
			taskId: activeTask?.id,
			logType: "TRACKED",
			source: "BROWSER",
			tags: [],
		}
		const { data } = await stopTimerRequest(params, authToken)

		const status: ITimerStatus = {
			duration: data.duration,
			running: data.isRunning,
		}
		setTimerStatus(status)
	}, [taskId.current])

	// If active team changes then stop the timer
	useEffect(() => {
		if (
			lastActiveTeamId.current !== null &&
			activeTeamId !== lastActiveTeamId.current &&
			!firstLoad &&
			timerStatusRef.current?.running
		) {
			stopTimer()
		}
		if (activeTeamId) {
			lastActiveTeamId.current = activeTeamId
		}
	}, [firstLoad, activeTeamId, activeTeam])

	// If active task changes then stop the timer
	useEffect(() => {
		const taskId = activeTask?.id
		if (
			lastActiveTaskId.current !== null &&
			taskId !== lastActiveTaskId.current &&
			firstLoad &&
			timerStatusRef.current?.running
		) {
			stopTimer()
		}
		if (taskId) {
			lastActiveTaskId.current = taskId
		}
	}, [firstLoad, activeTask?.id])

	useEffect(() => {
		if (isSuccess) {
			setTimerStatus(timerStatusData)
		}
	}, [isLoading, isRefetching, isSuccess])

	return {
		timeCounterState,
		fomatedTimeCounter: convertMsToTime(timeCounterState),
		timerStatusFetchingState,
		loading,
		timerStatus,
		firstLoadTimerData,
		startTimer,
		stopTimer,
		canRunTimer,
		firstLoad,
		toggleTimer,
		timerSeconds,
	}
}

/**
 * It returns an object with the current time, the current seconds, and the current timer status
 * @returns A function that returns a value.
 */
export function useLiveTimerStatus() {
	const {
		TimerStore: { timerSecondsState, timerStatus },
	} = useStores()

	const { h, m } = secondsToTime((timerStatus?.duration || 0) + timerSecondsState)

	return {
		time: { h, m },
		seconds: timerSecondsState,
		timerStatus,
	}
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
	} = useTimer()

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds)

	const timerHanlder = () => {
		if (timerStatusFetching || !canRunTimer) return
		if (timerStatus?.running) {
			stopTimer()
		} else {
			startTimer()
		}
	}

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
	}
}

export function useSyncTimer() {
	const { syncTimer } = useTimer()
	const timerStatus = useRecoilValue(timerStatusState)

	useRefreshInterval(timerStatus?.running ? syncTimer : () => {}, 5000)
}
