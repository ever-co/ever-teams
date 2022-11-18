import { IInviteCreate } from "@app/interfaces/IInvite";
import { serverFetch } from "../fetch";

export function inviteByEmailsRequest(
  body: IInviteCreate,
  bearer_token: string
) {
  return serverFetch({
    path: "/invite/emails",
    method: "POST",
    body,
    bearer_token,
    tenantId: body.tenantId,
  });
}
