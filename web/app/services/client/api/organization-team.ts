import { PaginationResponse } from "@app/interfaces/IDataResponse";
import { IOrganizationTeamList } from "@app/interfaces/IOrganizationTeam";
import api from "../axios";

export const getOrganizationTeamsAPI = () => {
  return api.get<PaginationResponse<IOrganizationTeamList>>(
    "/organization-team"
  );
};
