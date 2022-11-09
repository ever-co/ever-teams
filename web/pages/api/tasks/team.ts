import { getActiveTeamIdCookie } from "@app/helpers/cookies";
import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import {
  createTaskRequest,
  getTeamTasksRequest,
} from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, tenantId, organizationId, access_token } =
    await authenticatedGuard(req, res);
  if (!user) return $res();

  if (req.method === "POST") {
    const body = req.body as { name?: string };
    const $name = body.name?.trim() || "";
    if ($name.trim().length < 2) {
      return res.status(400).json({ errors: { name: "Invalid task name !" } });
    }
    const activeTeam = getActiveTeamIdCookie({ req, res });

    // const s = await createTaskRequest({
    //   bearer_token: access_token,
    //   data: {
    //     title: $name,
    //     description: "",
    //     status: "Todo",
    //     members: []
    //   },
    // });
  }

  const { data: tasks } = await getTeamTasksRequest({
    tenantId,
    organizationId,
    bearer_token: access_token,
  });

  $res.status(200).json(tasks);
}
