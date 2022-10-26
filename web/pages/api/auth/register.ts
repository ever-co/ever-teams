import {
  RECAPTCHA_SECRET_KEY,
  REFRESH_TOKEN_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@app/constants";
import { generateToken } from "@app/helpers/generate-token";
import { authFormValidate } from "@app/helpers/validations";
import { IRegisterDataAPI } from "@app/interfaces/IAuthentication";
import { recaptchaVerification } from "@app/services/server/recaptcha";
import {
  currentAuthenticatedUserRequest,
  loginUserRequest,
  registerUserRequest,
} from "@app/services/server/requests/auth";
import { createOrganizationRequest } from "@app/services/server/requests/organization";
import { createOrganizationTeamRequest } from "@app/services/server/requests/organization-team";
import { createTenantRequest } from "@app/services/server/requests/tenant";
import { NextApiRequest, NextApiResponse } from "next";
import { setCookie } from "cookies-next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
  const firstName = names[0];

  // Register user
  const { data: user } = await registerUserRequest({
    password: password,
    confirmPassword: password,
    user: {
      firstName: firstName,
      lastName: names[1] || "",
      email: body.email,
    },
  });
  // User Login, get the access token
  const { data: loginRes } = await loginUserRequest(body.email, password);

  // Create user tenant
  const { data: tenant } = await createTenantRequest(firstName, loginRes.token);

  // Create user organization
  const { data: organization } = await createOrganizationRequest(
    {
      currency: "USD",
      name: firstName,
      tenantId: tenant.id,
    },
    loginRes.token
  );

  // Create user organization team
  const { data: team } = await createOrganizationTeamRequest(
    {
      name: firstName,
      tenantId: tenant.id,
      organizationId: organization.id,
      managers: [user.id],
    },
    loginRes.token
  );

  setCookie(REFRESH_TOKEN_COOKIE_NAME, loginRes.refresh_token, {
    res: res,
    req: req,
  });
  setCookie(TOKEN_COOKIE_NAME, loginRes.token, {
    res: res,
    req: req,
  });

  res.status(200).json({ loginRes, team });
}
