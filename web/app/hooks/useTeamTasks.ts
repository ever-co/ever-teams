import {
  getActiveTaskIdCookie,
  setActiveTaskIdCookie,
} from "@app/helpers/cookies";
import { ITeamTask } from "@app/interfaces/ITask";
import {
  createTeamTaskAPI,
  deleteTaskAPI,
  getTeamTasksAPI,
  updateTaskAPI,
} from "@app/services/client/api";
import { activeTeamIdState } from "@app/stores";
import {
  activeTeamTaskState,
  tasksByTeamState,
  tasksFetchingState,
  teamTasksState,
} from "@app/stores/team-tasks";
import { useCallback, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { useQuery } from "./useQuery";

export function useTeamTasks() {
  const setAllTasks = useSetRecoilState(teamTasksState);
  const tasks = useRecoilValue(tasksByTeamState);
  const [tasksFetching, setTasksFetching] = useRecoilState(tasksFetchingState);

  const activeTeamId = useRecoilValue(activeTeamIdState);
  const [activeTeamTask, setActiveTeamTask] =
    useRecoilState(activeTeamTaskState);
  const [firstLoad, setFirstLoad] = useState(false);

  // Queries hooks
  const { queryCall, loading } = useQuery(getTeamTasksAPI);

  const { queryCall: deleteQueryCall, loading: deleteLoading } =
    useQuery(deleteTaskAPI);

  const { queryCall: createQueryCall, loading: createLoading } =
    useQuery(createTeamTaskAPI);

  const { queryCall: updateQueryCall, loading: updateLoading } =
    useQuery(updateTaskAPI);

  /**
   * To be called once, at the top level component (e.g main.tsx)
   */
  const firstLoadTasksData = useCallback(() => {
    setFirstLoad(true);
  }, []);

  const loadTeamTasksData = useCallback(() => {
    return queryCall().then((res) => {
      setAllTasks(res.data?.items || []);
      return res;
    });
  }, []);

  // Global loading state
  useEffect(() => {
    if (firstLoad) {
      setTasksFetching(loading);
    }
  }, [loading, firstLoad]);

  // Reload tasks after active team changed
  useEffect(() => {
    if (activeTeamId && firstLoad) {
      loadTeamTasksData();
    }
  }, [activeTeamId, firstLoad]);

  // Get the active task from cookie and put on global store
  useEffect(() => {
    const active_taskid = getActiveTaskIdCookie() || "";
    setActiveTeamTask(tasks.find((ts) => ts.id === active_taskid) || null);
  }, [tasks]);

  // Queries calls
  const deleteTask = useCallback((task: typeof tasks[0]) => {
    return deleteQueryCall(task.id).then((res) => {
      const affected = res.data?.affected || 0;
      if (affected > 0) {
        setAllTasks((ts) => {
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
      setAllTasks(res.data?.items || []);
      return res;
    });
  }, []);

  const updateTask = useCallback(
    (task: Partial<typeof tasks[0]> & { id: string }) => {
      return updateQueryCall(task.id, task).then((res) => {
        setAllTasks(res.data?.items || []);
        return res;
      });
    },
    []
  );

  /**
   * Change active task
   */
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
    updateTask,
    updateLoading,
    setActiveTask,
    activeTeamTask,
    firstLoadTasksData,
  };
}
