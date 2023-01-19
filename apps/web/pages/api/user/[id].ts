import { IUser } from "@app/interfaces/IUserData";
import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import {
  updateUserAvatarRequest,
} from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, access_token,tenantId } =
    await authenticatedGuard(req, res);
  if (!user) return $res();

  const body = req.body as IUser;
  switch (req.method) {
    case "PUT":
      const { data: response } = await updateUserAvatarRequest(
        {
          data: { imageUrl: body?.imageUrl },
          id: user.id as string,
          tenantId
        },
        access_token
      );
      return $res.json(response);
  }
  // $res.status(200);
}
