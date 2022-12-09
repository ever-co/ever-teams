import { convertMsToTime } from '../../helpers/date';
import { startTimerRequest, stopTimerRequest, getTimerStatusRequest, toggleTimerRequest } from '../../services/requests/timer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSyncRef } from './useSyncRef';
import { ILocalTimerStatus, ITimerParams, ITimerStatus } from '../../services/interfaces/ITimer';
import { useFirstLoad } from './useFirstLoad';
import LocalStorage from '../../services/api/tokenHandler';
import { useStores } from '../../models';

const LOCAL_TIMER_STORAGE_KEY = 'local-timer-gauzy-teams';


/**
 * Don't modify this function unless you know what you're doing
 */
function useLocalTimeCounter(
    timerStatus: ITimerStatus | null,
    firstLoad: boolean
) {
    const {
        TimerStore: {
            setTimerCounterState,
            timeCounterState,
            timeCounterIntervalState,
            setTimerCounterIntervalState,
            localTimerStatusState,
            setLocalTimerStatusState, }
    } = useStores();

    const timeCounterInterval = timeCounterIntervalState;

    const localTimerStatus = localTimerStatusState;

    const localTimerStatusRef = useSyncRef(localTimerStatus);
    const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
    const [timeCounter, setTimeCounter] = useState(timeCounterState); // in millisencods
    const { seconds } = convertMsToTime(timeCounter);

    const updateLocalStorage = useCallback((status: ILocalTimerStatus) => {
        LocalStorage.set(LOCAL_TIMER_STORAGE_KEY, JSON.stringify(status));
    }, []);

    const updateLocalTimerStatus = useCallback((status: ILocalTimerStatus) => {
        updateLocalStorage(status); // the order is important (first update localstorage, then update the store state)
        setLocalTimerStatusState(status);
        console.log("Update :" + JSON.stringify(status))
    }, []);

    const getLocalCounterStatus = useCallback(() => {
        let data: ILocalTimerStatus | null = null;

        return localTimerStatusState;
    }, []);

    // Update local time status (storage and store) only when global timerStatus changes
    useEffect(() => {
        if (firstLoad) {
            const localStatus = getLocalCounterStatus();
            localStatus &&
                setLocalTimerStatusState({
                    ...localStatus,
                    duration: localStatus.running ? localStatus.duration : 0,
                });

            timerStatus &&
                updateLocalTimerStatus({
                    duration: localStatus?.running ? localStatus.duration : 0,
                    running: timerStatus.running,
                    lastTaskId: timerStatus.lastLog?.taskId || null,
                });
        }
    }, [firstLoad, timerStatus]);

    // Update local timer status
    useEffect(() => {
        if (localTimerStatusRef.current?.isRunning && firstLoad) {
            updateLocalStorage({
                duration: timeCounter,
                running: localTimerStatusRef.current.running,
                lastTaskId: localTimerStatusRef.current.lastTaskId,
            });
        }
    }, [seconds, firstLoad]);

    // Time Counter
    useEffect(() => {
        if (firstLoad || !localTimerStatus) return;
        clearInterval(timeCounterIntervalRef.current);
        if (localTimerStatus.running) {
            setTimeCounter(0);
            const INTERVAL = 50; // MS
            setTimerCounterIntervalState(
                setInterval(() => {
                    setTimeCounter((c) => c + INTERVAL);
                    setTimerCounterState(timeCounter+INTERVAL);
                }, INTERVAL)
            );
        }
    }, [localTimerStatus, firstLoad]);

    // Update time counter from local timer status
    useEffect(() => {
        if (firstLoad) {
            setTimerCounterState(localTimerStatus?.duration || 0);
        }
    }, [localTimerStatus?.duration, firstLoad]);

    return { updateLocalTimerStatus, timeCounter, setTimeCounter };
}

export function useTimer() {
    const {
        authenticationStore: { authToken, organizationId, tenantId, },
        teamStore: { activeTeam },
        TaskStore: { activeTask },
        TimerStore: {
            timerStatusState,
            setTimerCounterIntervalState,
            setTimerCounterState,
            setCanRunTimer,
            timeCounterState,
            timerStatusFetchingState,
            timeCounterIntervalState,
            setTimerStatus,
            setTimerStatusFetching,
            localTimerStatusState
        }
    } = useStores();

    const activeTeamTask = activeTask;
    const activeTeamId = activeTeam?.id;
    const [loading, setLoading] = useState(false);
    const [stopTimerLoading, setStopTimerLoading] = useState(false);

    const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad();


    // const wasRunning = timerStatus?.running || false;
    const timerStatusRef = useSyncRef(timerStatusState);
    const taskId = useSyncRef(activeTeamTask?.id);
    const lastActiveTeamId = useRef<string | null>(null);
    const lastActiveTaskId = useRef<string | null>(null);
    const canRunTimer = activeTeamTask.id !== undefined && activeTeamTask.status !== 'Closed';
    // Local time status
    const { timeCounter, updateLocalTimerStatus, setTimeCounter } = useLocalTimeCounter(
        timerStatusState,
        firstLoad,
    );

    const getTimerStatus = useCallback(async () => {

        const response = await getTimerStatusRequest({ source: "BROWSER", tenantId, organizationId }, authToken);
        setTimerStatus(response.data)
        return response;

    }, []);

    const toggleTimer = useCallback(async (taskId: string, updateStore = true) => {

        const response = await toggleTimerRequest({ logType: "TRACKED", source: "BROWSER", tags: [], taskId: activeTask?.id, tenantId, organizationId }, authToken)
        setTimerStatus(response.data)
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
        setTimerCounterState(0)
        updateLocalTimerStatus({
            lastTaskId: taskId.current,
            running: true,
            duration: 0,
        });

        const params: ITimerParams = {
            organizationId,
            tenantId,
            taskId: activeTask?.id,
            logType: "TRACKED",
            source: "BROWSER",
            tags: []
        }
        const response = await startTimerRequest(params, authToken);
        setTimerStatus(response.data)

        setTimerStatusFetching(false)

        return response;
    }, [taskId.current]);

    // Stop timer
    const stopTimer = useCallback(async () => {
        setTimerCounterState(0);
        setTimeCounter(0)
        updateLocalTimerStatus({
            lastTaskId: taskId.current || null,
            running: false,
            duration: 0,
        });
        const params: ITimerParams = {
            organizationId,
            tenantId,
            taskId: activeTask?.id,
            logType: "TRACKED",
            source: "BROWSER",
            tags: []
        }
        const { data } = await stopTimerRequest(params, authToken);
        setTimerStatus(data)
    }, [taskId.current]);

    // If active team changes then stop the timer
    useEffect(() => {
        if (
            lastActiveTeamId.current !== null &&
            activeTeamId !== lastActiveTeamId.current &&
            !firstLoad && timerStatusRef.current?.isRunning
        ) {
            stopTimer();
        }
        if (activeTeamId) {
            lastActiveTeamId.current = activeTeamId;
        }
    }, [firstLoad, activeTeamId, activeTeam]);

    // If active task changes then stop the timer
    useEffect(() => {
        const taskId = activeTeamTask?.id;
        if (
            lastActiveTaskId.current !== null &&
            taskId !== lastActiveTaskId.current &&
            !firstLoad &&
            timerStatusRef.current?.isRunning
        ) {
            stopTimer();

        }
        if (taskId) {
            lastActiveTaskId.current = taskId;
        }
    }, [firstLoad, activeTeamTask?.id, activeTask]);


    return {
        timeCounter,
        fomatedTimeCounter: convertMsToTime(timeCounter),
        timerStatusFetchingState,
        getTimerStatus,
        loading,
        timerStatusState,
        firstLoadTimerData,
        startTimer,
        stopTimer,
        canRunTimer,
        firstLoad,
        toggleTimer,
    };
}