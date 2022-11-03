import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import {
  createOrganizationTeamRequest,
  getAllOrganizationTeamRequest,
} from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, access_token, tenantId, organizationId } =
    await authenticatedGuard(req, res);

  if (!user) return $res();

  if (req.method === "POST") {
    const body = req.body as { name?: string };
    const $name = body.name?.trim() || "";
    if ($name.trim().length < 2) {
      return res.status(400).json({ errors: { name: "Invalid team name !" } });
    }
    await createOrganizationTeamRequest(
      { name: $name, tenantId, organizationId, managers: [user.id] },
      access_token
    );
  }

  const { data } = await getAllOrganizationTeamRequest(
    { tenantId, organizationId },
    access_token
  );

  return $res.json(data);
}
