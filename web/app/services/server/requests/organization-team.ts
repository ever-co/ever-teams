import {
  IOrganizationTeam,
  IOrganizationTeamCreate,
} from "@app/interfaces/IOrganizationTeam";
import { serverFetch } from "../fetch";

export function createOrganizationTeamRequest(
  datas: IOrganizationTeamCreate,
  bearer_token: string
) {
  return serverFetch<IOrganizationTeam>({
    path: "/organization-team",
    method: "POST",
    body: datas,
    bearer_token,
  });
}
