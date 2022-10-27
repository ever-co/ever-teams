import {
  getOrganizationIdCookie,
  getTenantIdCookie,
} from "@app/helpers/cookies";
import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import { getAllOrganizationTeamRequest } from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, access_token } = await authenticatedGuard(req, res);
  if (!user) return $res();

  const { data } = await getAllOrganizationTeamRequest(
    {
      tenantId: getTenantIdCookie({ req, res }),
      organizationId: getOrganizationIdCookie({ req, res }),
    },
    access_token
  );

  return $res.json(data);
}
