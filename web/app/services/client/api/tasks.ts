import { PaginationResponse } from "@app/interfaces/IDataResponse";
import { ITeamTask } from "@app/interfaces/ITask";
import api from "../axios";

export function getTeamTasksAPI() {
  return api.get<PaginationResponse<ITeamTask>>("/tasks/team");
}
