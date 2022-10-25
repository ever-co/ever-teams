import {
  IOrganizationTeam,
  IOrganizationTeamCreate,
} from "@app/interfaces/IOrganizationTeam";
import { serverFetch } from "../fetch";

export function createOrganizationTeamRequest(
  datas: IOrganizationTeamCreate,
  bearer_token: string
) {
  return serverFetch<IOrganizationTeam>(
    "/organization-team",
    "POST",
    datas,
    bearer_token
  );
}
