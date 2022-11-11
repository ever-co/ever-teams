import { ITeamTask } from "@app/interfaces/ITask";
import { atom } from "recoil";

export const teamTasksState = atom<ITeamTask[]>({
  key: "teamTasksState",
  default: [],
});

export const activeTeamTaskState = atom<ITeamTask | null>({
  key: "activeTeamTaskState",
  default: null,
});
