import { PaginationResponse } from "@app/interfaces/IDataResponse";
import { IInvitation, IInviteCreate } from "@app/interfaces/IInvite";
import { serverFetch } from "../fetch";

export function inviteByEmailsRequest(
  body: IInviteCreate,
  bearer_token: string
) {
  return serverFetch<PaginationResponse<IInvitation>>({
    path: "/invite/emails",
    method: "POST",
    body,
    bearer_token,
    tenantId: body.tenantId,
  });
}

type ITeamInvitationsRequest = {
  tenantId: string;
  organizationId: string;
  role: "EMPLOYEE";
  teamId: string;
};
export function getTeamInvitationsRequest(
  { teamId, tenantId, organizationId, role }: ITeamInvitationsRequest,
  bearer_token: string
) {
  const query = new URLSearchParams({
    "where[tenantId]": tenantId,
    "where[organizationId]": organizationId,
    // "where[role][name]": role,
    "where[teams][id][0]": teamId,
  });
  return serverFetch<PaginationResponse<IInvitation>>({
    path: `/invite?${query.toString()}`,
    method: "GET",
    bearer_token,
    tenantId: tenantId,
  });
}
