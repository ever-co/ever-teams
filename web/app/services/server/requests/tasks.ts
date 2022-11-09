import {
  DeleteReponse,
  PaginationResponse,
} from "@app/interfaces/IDataResponse";
import { ICreateTask, ITeamTask } from "@app/interfaces/ITask";
import { serverFetch } from "../fetch";

export function getTeamTasksRequest({
  tenantId,
  organizationId,
  bearer_token,
}: {
  tenantId: string;
  organizationId: string;
  bearer_token: string;
}) {
  const query = new URLSearchParams({
    "where[organizationId]": organizationId,
    "where[tenantId]": tenantId,
  });
  return serverFetch<PaginationResponse<ITeamTask>>({
    path: `/tasks/team?${query.toString()}`,
    method: "GET",
    bearer_token,
    tenantId,
  });
}

export function deleteTaskRequest({
  tenantId,
  taskId,
  bearer_token,
}: {
  tenantId: string;
  taskId: string;
  bearer_token: string;
}) {
  return serverFetch<DeleteReponse>({
    path: `/tasks/${taskId}?tenantId=${tenantId}`,
    method: "DELETE",
    bearer_token,
    tenantId,
  });
}

export function createTaskRequest({
  data,
  bearer_token,
}: {
  data: ICreateTask;
  bearer_token: string;
}) {
  return serverFetch({
    path: "/tasks",
    method: "POST",
    body: data,
    bearer_token,
  });
}
