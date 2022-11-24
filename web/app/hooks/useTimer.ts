import {
  getTimerStatusAPI,
  toggleTimerAPI,
} from "@app/services/client/api/timer";
import {
  intervState,
  runningStatusStateBiss,
  timerDataState,
  timerStatusState,
} from "@app/stores";
import { useCallback, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { useQuery } from "./useQuery";
import { useTeamTasks } from "./useTeamTasks";

export function useTimer() {
  const { activeTeamTask } = useTeamTasks();
  const { queryCall, loading } = useQuery(getTimerStatusAPI);
  const { queryCall: toggleQueryCall } = useQuery(toggleTimerAPI);
  const [timerStatus, setTimerStatus] = useRecoilState(timerStatusState);
  const [time, setTime] = useRecoilState(timerDataState);
  const [interv, setInterv] = useRecoilState(intervState);
  const [running, setRunning] = useRecoilState(runningStatusStateBiss);

  const firstLoad = useRef(false);

  const getTimerStatus = useCallback(() => {
    return queryCall().then((res) => {
      if (res.data) {
        setTimerStatus(res.data);
      }
      return res;
    });
  }, [queryCall, setTimerStatus]);

  const startTimer = () => {
    run();
    setRunning(true);
    setInterv(setInterval(run, 10));
  };

  const stopTimer = () => {
    clearInterval(interv);
    setRunning(false);
  };

  var updatedMs = time.ms,
    updatedS = time.s,
    updatedM = time.m,
    updatedH = time.h;

  const run = () => {
    if (updatedM === 60) {
      updatedH++;
      updatedM = 0;
    }

    if (updatedS === 60) {
      updatedM++;
      updatedS = 0;
    }

    if (updatedMs === 100) {
      updatedS++;
      updatedMs = 0;
    }
    updatedMs++;
    return setTime({ ms: updatedMs, s: updatedS, m: updatedM, h: updatedH });
  };

  // To be called once
  const initiateTimer = useCallback(() => {
    firstLoad.current = true;
  }, []);

  useEffect(() => {
    if (!firstLoad.current) return;
    if (activeTeamTask) {
    }
  }, [activeTeamTask]);

  return {
    getTimerStatus,
    loading,
    timerStatus,
    running,
    time,
    initiateTimer,
    startTimer,
    stopTimer,
  };
}
