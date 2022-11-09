import { deleteTaskAPI, getTeamTasksAPI } from "@app/services/client/api";
import { teamTasksState } from "@app/stores/team-tasks";
import { useCallback } from "react";
import { useRecoilState } from "recoil";
import { useQuery } from "./useQuery";

export function useTeamTasks() {
  const [tasks, setTasks] = useRecoilState(teamTasksState);
  const { queryCall, loading } = useQuery(getTeamTasksAPI);
  const { queryCall: deleteQueryCall, loading: deleteLoading } =
    useQuery(deleteTaskAPI);

  const loadTeamTasksData = useCallback(() => {
    return queryCall().then((res) => {
      setTasks(res.data?.items || []);
      return res;
    });
  }, []);

  const deleteTask = useCallback((task: typeof tasks[0]) => {
    return deleteQueryCall(task.id).then((res) => {
      const affected = res.data?.affected || 0;
      if (affected > 0) {
        setTasks((ts) => {
          return ts.filter((t) => t.id !== task.id);
        });
      }

      return res;
    });
  }, []);

  return { tasks, loadTeamTasksData, loading, deleteTask, deleteLoading };
}
