import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import { toggleTimerRequest } from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, tenantId, access_token } = await authenticatedGuard(
    req,
    res
  );
  if (!user) return $res();

  if (req.method !== "POST") {
    $res.status(405).send({});
    return;
  }

  const body = req.body as { taskId: string };

  if (!body?.taskId) {
    $res
      .status(400)
      .send({ errors: { taskId: "Cannot find the active task" } });
    return;
  }

  const { data } = await toggleTimerRequest(
    {
      source: "BROWSER",
      logType: "TRACKED",
      tenantId,
      taskId: body.taskId,
    },
    access_token
  );

  return $res.json(data);
}
