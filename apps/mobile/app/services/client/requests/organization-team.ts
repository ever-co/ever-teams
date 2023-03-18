import { PaginationResponse } from "../../interfaces/IDataResponse";
import {
  IOrganizationTeam,
  IOrganizationTeamCreate,
  IOrganizationTeamList,
  IOrganizationTeamUpdate,
} from "../../interfaces/IOrganizationTeam";
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

export function updateOrganizationTeamRequest(
  {
    id,
    datas,
    bearer_token
  }
    : {
      datas: IOrganizationTeamList,
      id: string,
      bearer_token: string
    }
) {
  return serverFetch<IOrganizationTeamList>({
    path: `/organization-team/${id}`,
    method: "PUT",
    body: datas,
    bearer_token,
  });
}

export function getOrganizationTeamRequest(id: string, bearer_token: string) {
  return serverFetch<IOrganizationTeamList>({
    path: `/organization-team/${id}`,
    method: "GET",
    bearer_token,
  });
}

type TeamRequestParams = {
  organizationId: string;
  tenantId: string;
  relations?: string[];
};

export function getAllOrganizationTeamRequest(
  {
    organizationId,
    tenantId,
    relations = [
      "members",
      "members.role",
      "members.employee",
      "members.employee.user",
    ],
  }: TeamRequestParams,
  bearer_token: string
) {
  const params = {
    "where[organizationId]": organizationId,
    "where[tenantId]": tenantId,
  } as { [x: string]: string };

  relations.forEach((rl, i) => {
    params[`relations[${i}]`] = rl;
  });

  const query = new URLSearchParams(params);

  return serverFetch<PaginationResponse<IOrganizationTeamList>>({
    path: `/organization-team?${query.toString()}`,
    method: "GET",
    bearer_token,
    tenantId,
  });
}

export function removeEmployeeOrganizationTeamRequest({
	employeeId,
	bearer_token,
	tenantId,
}: {
	employeeId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<boolean>({
		path: `/organization-team-employee/${employeeId}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}

export function removeUserFromAllTeam({
	userId,
	bearer_token,
	tenantId,
}: {
	userId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch({
		path: `/organization-team/teams/${userId}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}

export function deleteOrganizationTeamRequest({
	id,
	bearer_token,
	tenantId,
	organizationId,
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
	organizationId: string;
}) {
	return serverFetch<IOrganizationTeamUpdate>({
		path: `/organization-team/${id}?organizationId=${organizationId}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}