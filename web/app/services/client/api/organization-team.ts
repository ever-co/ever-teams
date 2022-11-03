import { PaginationResponse } from "@app/interfaces/IDataResponse";
import { IOrganizationTeamList } from "@app/interfaces/IOrganizationTeam";
import api from "../axios";

export function getOrganizationTeamsAPI() {
  return api.get<PaginationResponse<IOrganizationTeamList>>(
    "/organization-team"
  );
}

export function createOrganizationAPI(name: string) {
  return api.post<PaginationResponse<IOrganizationTeamList>>(
    "/organization-team",
    { name }
  );
}
