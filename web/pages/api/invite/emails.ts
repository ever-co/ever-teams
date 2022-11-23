import { IInviteRequest } from "@app/interfaces/IInvite";
import { authenticatedGuard } from "@app/services/server/guards/authenticated-guard";
import {
  inviteByEmailsRequest,
  sendAuthCode,
} from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { $res, user, organizationId, access_token, teamId, tenantId } =
    await authenticatedGuard(req, res);
  if (!user) return $res();

  const body = req.body as IInviteRequest;

  const { data } = await inviteByEmailsRequest(
    {
      startedWorkOn: new Date().toISOString(),
      tenantId,
      organizationId,
      emailIds: [body.email],
      roleId: user.roleId!,
      invitationExpirationPeriod: "Never",
      inviteType: "EMPLOYEE",
      invitedById: user.id,
      teamIds: [teamId],
      projectIds: [teamId],
    },
    access_token
  );

  // const { data: k } = await sendAuthCode(body.email);

  $res.status(200).json(data);
}
