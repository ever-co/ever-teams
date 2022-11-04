import { setAuthCookies } from "@app/helpers/cookies";
import { authFormValidate } from "@app/helpers/validations";
import { ILoginDataAPI } from "@app/interfaces/IAuthentication";
import {
  getAllOrganizationTeamRequest,
  getUserOrganizationsRequest,
  loginUserRequest,
} from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const body = req.body as ILoginDataAPI;

  const { errors, valid: formValid } = authFormValidate(
    ["email", "code"],
    body as any
  );

  if (!formValid) {
    return res.status(400).json({ errors });
  }

  // User Login, get the access token
  const { data: loginRes, response } = await loginUserRequest(
    body.email,
    body.code
  );

  if (!response.ok || (loginRes as any).status === 404) {
    return res.status(400).json({
      errors: {
        email: "We couldn't find account  associated to this email",
      },
    });
  }

  const tenantId = loginRes.user.tenantId!;
  const access_token = loginRes.token;
  const userId = loginRes.user.id;

  const { data: organizations } = await getUserOrganizationsRequest(
    { tenantId, userId },
    access_token
  );

  const organization = organizations?.items[0];

  if (!organization) {
    return res.status(400).json({
      errors: {
        email: "Your account is not yet ready to be used on the gauzy team",
      },
    });
  }

  const { data: teams } = await getAllOrganizationTeamRequest(
    { tenantId, organizationId: organization.organizationId },
    access_token
  );

  const team = teams.items[0];

  if (!team) {
    return res.status(400).json({
      errors: {
        email: "We couldn't find any teams associated with this account",
      },
    });
  }

  setAuthCookies(
    {
      access_token: loginRes.token,
      refresh_token: {
        token: loginRes.refresh_token,
      },
      teamId: team.id,
      tenantId,
      organizationId: organization.id,
    },
    req,
    res
  );

  res.status(200).json({ team, loginRes });
}
