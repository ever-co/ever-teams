import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import { deleteTaskRequest } from "@app/services/server/requests";
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
  const { id: taskId } = req.query;

  if (req.method === "DELETE") {
    const { data } = await deleteTaskRequest({
      bearer_token: access_token,
      taskId: taskId as string,
      tenantId,
    });

    res.status(200).json(data);
    return;
  }
}
