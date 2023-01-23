import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import {
    getLanguageListRequest,
} from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, access_token, tenantId } =
    await authenticatedGuard(req, res);
  if (!user) return $res();

  switch (req.method) {
    case "GET":
      const { data: response } = await getLanguageListRequest(
        {
          is_system: user.role.isSystem as boolean,
          tenantId
        },
        access_token
      );
      return $res.json(response);
  }
}
