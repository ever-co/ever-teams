import { PaginationResponse } from "@app/interfaces/IDataResponse";
import {
  IOrganizationTeamList,
  IOrganizationTeamWithMStatus,
} from "@app/interfaces/IOrganizationTeam";
import api from "../axios";

export function getOrganizationTeamsAPI() {
  return api.get<PaginationResponse<IOrganizationTeamList>>(
    "/organization-team"
  );
}

export function createOrganizationTeamAPI(name: string) {
  return api.post<PaginationResponse<IOrganizationTeamList>>(
    "/organization-team",
    { name }
  );
}

export function getOrganizationTeamAPI(teamId: string) {
  return api.get<IOrganizationTeamWithMStatus>(`/organization-team/${teamId}`);
}
