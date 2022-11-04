import { generateToken } from "@app/helpers/generate-token";
import { authFormValidate } from "@app/helpers/validations";
import { IRegisterDataAPI } from "@app/interfaces/IAuthentication";
import { recaptchaVerification } from "@app/services/server/recaptcha";
import {
  createOrganizationRequest,
  createOrganizationTeamRequest,
  createTenantRequest,
  loginUserRequest,
  registerUserRequest,
} from "@app/services/server/requests";
import { NextApiRequest, NextApiResponse } from "next";
import { setAuthCookies } from "@app/helpers/cookies";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405);
  }

  const body = req.body as IRegisterDataAPI;

  const { errors, valid: formValid } = authFormValidate(
    ["email", "name", "recaptcha", "team"],
    body
  );

  if (!formValid) {
    return res.status(400).json({ errors });
  }

  // const { success } = await recaptchaVerification({
  //   secret: RECAPTCHA_SECRET_KEY!,
  //   response: body.recaptcha,
  // });

  // if (!success) {
  //   return res
  //     .status(400)
  //     .json({ errors: { recaptcha: "Invalid reCAPTCHA. Please try again" } });
  // }

  // General a random password with 8 chars
  const password = generateToken(8);
  const names = body.name.split(" ");

  // Register user
  const { data: user } = await registerUserRequest({
    password: password,
    confirmPassword: password,
    user: {
      firstName: names[0],
      lastName: names[1] || "",
      email: body.email,
    },
  });
  // User Login, get the access token
  const { data: loginRes } = await loginUserRequest(body.email, password);

  // Create user tenant
  const { data: tenant } = await createTenantRequest(body.team, loginRes.token);

  // Create user organization
  const { data: organization } = await createOrganizationRequest(
    {
      currency: "USD",
      name: body.team,
      tenantId: tenant.id,
    },
    loginRes.token
  );

  // Create user organization team
  const { data: team } = await createOrganizationTeamRequest(
    {
      name: body.team,
      tenantId: tenant.id,
      organizationId: organization.id,
      managers: [user.id],
    },
    loginRes.token
  );

  setAuthCookies(
    {
      access_token: loginRes.token,
      refresh_token: {
        token: loginRes.refresh_token,
      },
      timezone: body["timezone"],
      teamId: team.id,
      tenantId: tenant.id,
      organizationId: organization.id,
    },
    req,
    res
  );

  res.status(200).json({ loginRes, team });
}
