import { ITeamTask } from "@app/interfaces/ITask";
import { deleteTaskAPI, getTeamTasksAPI } from "@app/services/client/api";
import { activeTeamState } from "@app/stores";
import { teamTasksState } from "@app/stores/team-tasks";
import { useCallback, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useQuery } from "./useQuery";

export function useTeamTasks() {
  const [tasks, setTasks] = useRecoilState(teamTasksState);
  const [Ltasks, setLTasks] = useState<ITeamTask[]>([]);

  const activeTeam = useRecoilValue(activeTeamState);
  const { queryCall, loading } = useQuery(getTeamTasksAPI);
  const { queryCall: deleteQueryCall, loading: deleteLoading } =
    useQuery(deleteTaskAPI);

  const loadTeamTasksData = useCallback(() => {
    return queryCall().then((res) => {
      setLTasks(res.data?.items || []);
      return res;
    });
  }, []);

  useEffect(() => {
    if (activeTeam) {
      setTasks((ts) => {
        return ts.filter((t) => {
          return t.teams.some((tm) => {
            return tm.id === activeTeam.id;
          });
        });
      });
    }
  }, [activeTeam, Ltasks]);

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

  const createTask = useCallback(() => {}, []);

  return {
    tasks,
    loadTeamTasksData,
    loading,
    deleteTask,
    deleteLoading,
    createTask,
  };
}
