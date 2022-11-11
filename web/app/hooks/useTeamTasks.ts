import {
  getActiveTaskIdCookie,
  setActiveTaskIdCookie,
} from "@app/helpers/cookies";
import { ITeamTask } from "@app/interfaces/ITask";
import {
  createTeamTaskAPI,
  deleteTaskAPI,
  getTeamTasksAPI,
} from "@app/services/client/api";
import { activeTeamState } from "@app/stores";
import {
  activeTeamTaskState,
  tasksFetchingState,
  teamTasksState,
} from "@app/stores/team-tasks";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useQuery } from "./useQuery";

export function useTeamTasks() {
  const [tasks, setTasks] = useRecoilState(teamTasksState);
  const [tasksFetching, setTasksFetching] = useRecoilState(tasksFetchingState);

  const activeTeam = useRecoilValue(activeTeamState);
  const [activeTeamTask, setActiveTeamTask] =
    useRecoilState(activeTeamTaskState);

  const [Ltasks, setLTasks] = useState<ITeamTask[]>([]);
  const firstLoad = useRef(false);

  // Queries hooks
  const { queryCall, loading } = useQuery(getTeamTasksAPI);
  const { queryCall: deleteQueryCall, loading: deleteLoading } =
    useQuery(deleteTaskAPI);
  const { queryCall: createQueryCall, loading: createLoading } =
    useQuery(createTeamTaskAPI);

  // to be called once
  const firstLoadTasksData = useCallback(() => {
    firstLoad.current = true;
  }, []);

  const loadTeamTasksData = useCallback(() => {
    return queryCall().then((res) => {
      setLTasks(res.data?.items || []);
      return res;
    });
  }, []);

  // Global loading state
  useEffect(() => {
    if (firstLoad.current) {
      setTasksFetching(loading);
    }
  }, [loading]);

  // Filter tasks by getting only tasks that correspond to the active team
  useEffect(() => {
    if (activeTeam) {
      setTasks(
        Ltasks.filter((t) => {
          return t.teams.some((tm) => {
            return tm.id === activeTeam.id;
          });
        })
      );
    }
  }, [activeTeam, Ltasks]);

  // Reload tasks after active team changed
  useEffect(() => {
    if (activeTeam && firstLoad.current) {
      loadTeamTasksData();
    }
  }, [activeTeam]);

  // Get the active task from cookie and put on global store
  useEffect(() => {
    const active_taskid = getActiveTaskIdCookie() || "";
    setActiveTeamTask(tasks.find((ts) => ts.id === active_taskid) || null);
  }, [tasks]);

  const deleteTask = useCallback((task: typeof tasks[0]) => {
    return deleteQueryCall(task.id).then((res) => {
      const affected = res.data?.affected || 0;
      if (affected > 0) {
        setLTasks((ts) => {
          return ts.filter((t) => t.id !== task.id);
        });
      }
      return res;
    });
  }, []);

  const createTask = useCallback((taskName: string) => {
    return createQueryCall({
      title: taskName,
    }).then((res) => {
      setLTasks(res.data?.items || []);
      return res;
    });
  }, []);

  const setActiveTask = useCallback((task: typeof tasks[0]) => {
    setActiveTaskIdCookie(task.id);
    setActiveTeamTask(task);
  }, []);

  return {
    tasks,
    loading,
    tasksFetching,
    deleteTask,
    deleteLoading,
    createTask,
    createLoading,
    setActiveTask,
    activeTeamTask,
    firstLoadTasksData,
  };
}
