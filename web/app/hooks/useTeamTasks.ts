import { teamTasksState } from "@app/stores/team-tasks";
import { useRecoilState } from "recoil";

export function useTeamTasks() {
  const [tasks, setTasks] = useRecoilState(teamTasksState);

  return { tasks };
}
