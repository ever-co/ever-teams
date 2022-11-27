import { number } from "mobx-state-tree/dist/internal";
import { IOrganizationTeamList } from "../interfaces/IOrganizationTeam";
import { IUser } from "../interfaces/IUserData";
import { getUserOrganizationsRequest } from "../requests/organization";
// import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import {
  createOrganizationTeamRequest,
  getAllOrganizationTeamRequest,
  getOrganizationTeamRequest,
} from "../requests/organization-team";
// import { NextApiRequest, NextApiResponse } from "next";

export interface ITeamsParams {
  userId: string;
  access_token: string;
  tenantId: string;
  organizationId: string;
  method: string;
  employeeId: string;
  teamName?: string;
}

export interface IOTeams {
  items: IOrganizationTeamList[];
  total: number
}



export default async function Teams(params: ITeamsParams) {
  const { teamName, method, employeeId, userId, access_token, tenantId, organizationId } = params


  if (!userId) return
  let createResponse;
  if (method === "POST") {
    const $name = teamName.trim() || "";
    if ($name.trim().length < 2) {
      // createResponse = {
      //   status: 400,
      //   message: "Invalid team name !",
      // }
    }
    await createOrganizationTeamRequest(
      {
        name: $name,
        tenantId,
        organizationId,
        managerIds: [employeeId],
      },
      access_token
    );
  }

  const { data: organizations } = await getUserOrganizationsRequest(
    { tenantId, userId: userId },
    access_token
  );

  const call_teams = organizations.items.map((item) => { 
    return getAllOrganizationTeamRequest(
      { tenantId, organizationId: item.organizationId },
      access_token
    );
  });

  try {

    const teams: IOTeams = await Promise.all(call_teams).then((tms) => {
      return tms.reduce(
        (acc, { data }) => {
          acc.items.push(...data.items);
          acc.total += data.total;
          return acc;
        },
        { items: [] as IOrganizationTeamList[], total: 0 }
      );
    });
    return teams;
  } catch (error) {
    console.log(error);
  }


}
