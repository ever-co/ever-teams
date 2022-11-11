import {
  DeleteReponse,
  PaginationResponse,
} from "@app/interfaces/IDataResponse";
import { ICreateTask, ITeamTask } from "@app/interfaces/ITask";
import api from "../axios";

export function getTeamTasksAPI() {
  return api.get<PaginationResponse<ITeamTask>>("/tasks/team");
}

export function deleteTaskAPI(taskId: string) {
  return api.delete<DeleteReponse>(`/tasks/${taskId}`);
}

export function createTeamTaskAPI(
  body: Partial<ICreateTask> & { title: string }
) {
  return api.post<PaginationResponse<ITeamTask>>("/tasks/team", body);
}
