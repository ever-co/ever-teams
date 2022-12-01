import { convertMsToTime } from '../../helpers/date';
import { startTimerRequest, stopTimerRequest, getTimerStatusRequest, toggleTimerRequest } from '../../services/requests/timer';
// import {
// 	activeTeamIdState,
// 	activeTeamTaskState,
// 	timeCounterIntervalState,
// 	timeCounterState,
// 	timerStatusFetchingState,
// 	timerStatusState,
// } from '@app/stores';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStores } from '../helpers/useStores';
import { useSyncRef } from './useSyncRef';
import { ITimerParams } from '../../services/interfaces/ITimer';

export function useTimer() {
    const {
        authenticationStore: { authToken, organizationId, tenantId, },
        teamStore: { activeTeam },
        TaskStore: { activeTask },
        TimerStore: { 
            timerStatusState, 
            stopTimer, 
            timeCounterState, 
            timerStatusFetchingState, 
            timeCounterIntervalState, 
            setTimerStatus, 
            setTimerStatusFetching,
            //  getTimerStatus,
              startTimer }
    } = useStores();

    // const lastActiveTeamId = activeTeam?.id;
    const activeTeamTask = activeTask;
    const activeTeamId = activeTeam?.id
    const timerStatus = timerStatusState;
    const timeCounter = timeCounterState;
    const [firstLoad, setFirstLoad] = useState(false);
    const timerStatusFetching = timerStatusFetchingState;
    const timeCounterInterval = timeCounterIntervalState


    // // Queries
    // const { queryCall, loading } = useQuery(getTimerStatusAPI);
    // const { queryCall: toggleQueryCall } = useQuery(toggleTimerAPI);
    // const { queryCall: startTimerQueryCall } = useQuery(startTimerAPI);
    // const { queryCall: stopTimerQueryCall, loading: stopTimerLoading } =
    // 	useQuery(stopTimerAPI);

    const wasRunning = timerStatus?.running || false;
    const timerTaskId = useSyncRef(timerStatus?.lastLog?.taskId);
    const timerStatusRef = useSyncRef(timerStatus);
    const taskId = useSyncRef(activeTeamTask?.id);
    const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
    const lastActiveTeamId = useRef<string | null>(null);
    const canRunTimer = !!activeTeamTask && activeTeamTask.status !== 'Closed';

    // /**
    //  * To be called once, at the top level component (e.g main.tsx)
    //  */
    const firstLoadTimerData = useCallback(() => {
        setFirstLoad(true);
    }, []);

    const getTimerStatus = useCallback(async() => {

        const response = await getTimerStatusRequest({source:"BROWSER", tenantId, organizationId }, authToken);
        // setTimerStatus(data?.data)
        console.log(JSON.stringify(response.data))
        return response;

    }, []);

    const toggleTimer = useCallback(async(taskId: string, updateStore = true) => {
    	// return toggleQueryCall({
    	// 	taskId,
    	// }).then((res) => {
    	// 	if (updateStore && res.data) {
    	// 		setTimerStatus(res.data);
    	// 	}
    	// 	return res;
    	// });
       const response= await toggleTimerRequest({logType:"TRACKED", source:"BROWSER", tags:[], taskId:activeTask?.id, tenantId, organizationId},authToken)
        console.log(JSON.stringify(response?.data))
    }, []);

    // // Loading states
    // useEffect(() => {
    // 	if (firstLoad) {
    // 		setTimerStatusFetching(loading);
    // 	}
    // }, [loading, firstLoad]);

    // useEffect(() => {
    // 	setTimerStatusFetching(stopTimerLoading);
    // }, [stopTimerLoading]);

    // // Start timer
    const startTimerFunction = useCallback(async () => {
        setTimerStatusFetching(true);
        if (!taskId.current) return;
        if (taskId.current !== timerTaskId.current) {
        	await toggleTimer(taskId.current, false);
        }

        const params: ITimerParams = {
            organizationId,
            tenantId,
            taskId: activeTask?.id,
            logType: "TRACKED",
            source: "BROWSER",
            tags: []
        }
       const response= await startTimerRequest(params,authToken);
        setTimerStatus(response.data)

        setTimerStatusFetching(false)

    }, [timerTaskId.current, taskId.current]);

    // Stop timer
    const stopTimerFunction = useCallback(async () => {
        // window.clearInterval(timeCounterIntervalRef.current);
        const params: ITimerParams = {
            organizationId,
            tenantId,
            taskId: activeTask?.id,
            logType: "TRACKED",
            source: "BROWSER",
            tags: []
        }
        const { data } = await stopTimerRequest(params, authToken);
        console.log(JSON.stringify(data))
    }, []);

    // // If active team change then stope the timer
    // useEffect(() => {
    // 	if (
    // 		lastActiveTeamId.current !== null &&
    // 		activeTeamId !== lastActiveTeamId.current &&
    // 		firstLoad &&
    // 		timerStatusRef.current?.running
    // 	) {
    // 		stopTimer();
    // 	}
    // 	if (activeTeamId) {
    // 		lastActiveTeamId.current = activeTeamId;
    // 	}
    // }, [activeTeamId]);

    // // Time Counter
    // useEffect(() => {
    // 	if (!firstLoad || !timerStatus) return;
    // 	window.clearInterval(timeCounterIntervalRef.current);
    // 	setTimeCounter(timerStatus.duration * 1000);
    // 	if (timerStatus.running) {
    // 		const INTERVAL = 50; // MS
    // 		setTimeCounterInterval(
    // 			window.setInterval(() => {
    // 				setTimeCounter((c) => c + INTERVAL);
    // 			}, INTERVAL)
    // 		);
    // 	}
    // }, [timerStatus, firstLoad]);

    // // Automaticaly change timer status when active task changes
    // useEffect(() => {
    // 	const canToggle =
    // 		activeTeamTask &&
    // 		timerTaskId.current !== activeTeamTask.id &&
    // 		firstLoad &&
    // 		wasRunning;

    // 	if (canToggle) {
    // 		setTimerStatusFetching(true);
    // 		toggleTimer(activeTeamTask.id).finally(() => {
    // 			setTimerStatusFetching(false);
    // 		});
    // 	}
    // }, [activeTeamTask?.id, firstLoad, wasRunning]);

    return {
        timeCounter,
        fomatedTimeCounter: convertMsToTime(timeCounter),
        timerStatusFetching,
        getTimerStatus,
        // loading,
        timerStatus,
        firstLoadTimerData,
        toggleTimer,
        stopTimerFunction,
        startTimerFunction,
        canRunTimer,
        firstLoad,
        lastActiveTeamId
    };
}