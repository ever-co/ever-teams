import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import { getOrganizationTeamRequest } from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, organizationId, access_token, tenantId, teamId } =
    await authenticatedGuard(req, res);
  if (!user) return $res();

  const { data: teamStatus } = await getOrganizationTeamRequest(
    teamId,
    access_token,
    tenantId,
    {
      organizationId,
      "relations[0]": "members",
      source: "BROWSER",
      withLaskWorkedTask: "true",
      tenantId,
    }
  );

  return $res.json(teamStatus);
}
