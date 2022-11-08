import { PaginationResponse } from "@app/interfaces/IDataResponse";
import { ITeamTask } from "@app/interfaces/ITask";
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
