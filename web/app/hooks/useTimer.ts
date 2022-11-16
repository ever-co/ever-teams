import {
  getTimerStatusAPI,
  toggleTimerAPI,
} from "@app/services/client/api/timer";
import { timerStatusState } from "@app/stores";
import { useCallback, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { useQuery } from "./useQuery";
import { useTeamTasks } from "./useTeamTasks";

export function useTimer() {
  const { activeTeamTask } = useTeamTasks();
  const { queryCall, loading } = useQuery(getTimerStatusAPI);
  const { queryCall: toggleQueryCall } = useQuery(toggleTimerAPI);
  const [timerStatus, setTimerStatus] = useRecoilState(timerStatusState);
  const firstLoad = useRef(false);

  const getTimerStatus = useCallback(() => {
    return queryCall().then((res) => {
      if (res.data) {
        setTimerStatus(res.data);
      }
      return res;
    });
  }, []);

  const startTimer = useCallback(() => {}, []);

  const stopTimer = useCallback(() => {}, []);

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
    initiateTimer,
    startTimer,
    stopTimer,
  };
}
