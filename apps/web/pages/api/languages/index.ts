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

	const par = {
		is_system: user.role.isSystem as boolean,
		tenantId
	};

  switch (req.method) {
    case "GET":
      return $res.json(await getLanguageListRequest(par,
				access_token
			));
  }
}
