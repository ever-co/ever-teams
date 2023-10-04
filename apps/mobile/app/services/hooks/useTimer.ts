/* eslint-disable camelcase */
import { convertMsToTime, secondsToTime } from "../../helpers/date"
import { startTimerRequest, stopTimerRequest, toggleTimerRequest } from "../client/requests/timer"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSyncRef } from "./useSyncRef"
import { ILocalTimerStatus, ITimerParams, ITimerStatus } from "../interfaces/ITimer"
import { useFirstLoad } from "./useFirstLoad"
import isEqual from "lodash/isEqual"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useStores } from "../../models"
import { ITeamTask } from "../interfaces/ITask"
import { useTeamTasks } from "./features/useTeamTasks"
import useFetchTimerStatus from "../client/queries/timer/timer"
import { useTaskStatistics } from "./features/useTaskStatics"
import moment from "moment-timezone"

const LOCAL_TIMER_STORAGE_KEY = "local-timer-ever-teams"

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
			setLocalTimerStatus,
			localTimerStatus,
			timeCounterState,
			timerSecondsState,
			setTimerSecondsState,
			setTimerCounterState,
		},
		TaskStore: { statActiveTask },
	} = useStores()

	const activeTaskStat = statActiveTask // active task statistics status

	// Refs
	const timerStatusRef = useSyncRef(timerStatus)
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval)
	const timerSecondsRef = useRef(0)
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

	// Update local time status (storage and store) only when global timerStatus changes
	useEffect(() => {
		if (!firstLoad) {
			;(async () => {
				const localStatus = await getLocalCounterStatus()
				localStatus && setLocalTimerStatus(localStatus)

				const timerStatusDate = timerStatus?.lastLog?.createdAt
					? moment(timerStatus?.lastLog?.createdAt).unix() * 1000 - timerStatus?.lastLog?.duration
					: 0

				timerStatus &&
					updateLocalTimerStatus({
						runnedDateTime:
							(timerStatus.running ? timerStatusDate || Date.now() : 0) ||
							localStatus?.runnedDateTime ||
							0,
						running: timerStatus.running,
						lastTaskId: timerStatus.lastLog?.taskId || null,
					})
			})()
		}
	}, [firstLoad, timerStatus])

	// THis is form constant update of the progress line
	timerSecondsRef.current = useMemo(() => {
		if (firstLoad) return 0
		if (seconds > timerSecondsRef.current) {
			return seconds
		}
		if (timerStatusRef.current && !timerStatusRef.current.running) {
			return 0
		}
		return timerSecondsRef.current
	}, [seconds, activeTaskStat, firstLoad])

	useEffect(() => {
		if (!firstLoad) {
			timerSecondsRef.current = 0
			setTimerSecondsState(0)
		}
	}, [activeTeamTask?.id, firstLoad])

	useEffect(() => {
		if (!firstLoad) {
			setTimerSecondsState(timerSecondsRef.current)
		}
	}, [timerSecondsRef.current, firstLoad])

	// Time Counter
	useEffect(() => {
		if (firstLoad || !localTimerStatus) return clearInterval(timeCounterIntervalRef.current)
		let timerFuntion

		if (localTimerStatus.running) {
			timerFuntion = setInterval(() => {
				const now = Date.now()
				setTimerCounterState(now - localTimerStatus.runnedDateTime)
			}, 50)
		} else {
			clearInterval(timerFuntion)
			setTimerCounterState(0)
		}
		return () => clearInterval(timerFuntion)
	}, [localTimerStatus, firstLoad])

	return {
		updateLocalTimerStatus,
		timeCounterState,
		timerSecondsState,
	}
}

export function useTimer() {
	const {
		authenticationStore: { tenantId, authToken, organizationId, user },
		TaskStore: { activeTask },
		teamStore: { activeTeamId, activeTeam },
		TimerStore: { timerStatus, setTimerStatusFetching, timerStatusFetchingState, setTimerStatus },
	} = useStores()

	const [stopTimerLoading, setStopTimerLoading] = useState(false)

	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad()
	const { updateTask } = useTeamTasks()
	// // const wasRunning = timerStatus?.running || false;
	const timerStatusRef = useSyncRef(timerStatus)
	const taskId = useSyncRef(activeTask?.id)
	const activeTeamTaskRef = useSyncRef(activeTask)
	const lastActiveTeamId = useRef<string | null>(null)
	const lastActiveTaskId = useRef<string | null>(null)
	const canRunTimer = !!activeTask?.id && activeTask.status !== "Closed"

	// // Local time status
	const { timeCounterState, updateLocalTimerStatus, timerSecondsState } = useLocalTimeCounter(
		timerStatus,
		activeTask,
		firstLoad,
	)

	const { isSuccess, data: timerStatusData } = useFetchTimerStatus(
		{
			authToken,
			tenantId,
			organizationId,
			employeeId: user?.employee?.id,
		},
		timerStatus?.running,
	)

	const toggleTimer = useCallback(async (taskId: string) => {
		const response = await toggleTimerRequest(
			{
				logType: "TRACKED",
				source: "MOBILE",
				tags: [],
				taskId,
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
			source: "MOBILE",
			tags: [],
		}

		const { data } = await startTimerRequest(params, authToken)

		const status: ITimerStatus = {
			duration: data?.duration,
			running: data?.isRunning,
			lastLog: data,
		}
		setTimerStatus(status)
		setTimerStatusFetching(false)

		/**
		 *  Updating the task status to "In Progress" when the timer is started.
		 */
		if (activeTeamTaskRef.current && activeTeamTaskRef.current.status !== "in-progress") {
			updateTask(
				{
					...activeTeamTaskRef.current,
					status: "in-progress",
				},
				taskId.current,
			)
		}

		return data
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
			source: "MOBILE",
			tags: [],
		}

		setStopTimerLoading(true)

		const { data } = await stopTimerRequest(params, authToken)

		setStopTimerLoading(false)

		const status: ITimerStatus = {
			duration: data.duration,
			running: data.isRunning,
			lastLog: data,
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
			!firstLoad &&
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
			if (!isEqual(timerStatus, timerStatusData)) {
				setTimerStatus(timerStatusData)
			}
		}
	}, [timerStatusData])

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
		activeTeamTask: activeTask,
	}
}

/**
 * It returns an object with the current time, the current seconds, and the current timer status
 * @returns A function that returns a value.
 */
export function useLiveTimerStatus() {
	const {
		TimerStore: { timerSecondsState: seconds, timerStatus },
	} = useStores()

	const { h, m } = secondsToTime((timerStatus?.duration || 0) + seconds)

	return {
		time: { h, m },
		seconds,
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
		timerStatusFetchingState,
		startTimer,
		stopTimer,
		canRunTimer,
		timerSecondsState,
		activeTeamTask,
	} = useTimer()

	const { activeTaskEstimation } = useTaskStatistics(timerSecondsState)

	const timerHanlder = () => {
		if (timerStatusFetchingState || !canRunTimer) return
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
		timerStatusFetchingState,
		timerStatus,
		activeTeamTask,
		disabled: !canRunTimer,
		startTimer,
		stopTimer,
	}
}
