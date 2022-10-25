import { RECAPTCHA_SITE_KEY } from "@app/constants";
import { generateToken } from "@app/helpers/generate-token";
import { authFormValidate } from "@app/helpers/validations";
import { IRegisterDataAPI } from "@app/interfaces/IAuthentication";
import { recaptchaVerification } from "@app/services/server/recaptcha";
import { registerUserRequest } from "@app/services/server/requests/auth";
import { NextApiRequest, NextApiResponse } from "next";

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

  const { success } = await recaptchaVerification(
    RECAPTCHA_SITE_KEY!,
    body.recaptcha
  );

  if (!success) {
    return res
      .status(400)
      .json({ errors: { recaptcha: "Invalid reCAPTCHA. Please try again" } });
  }

  // General a random password with 8 chars
  const password = generateToken(8);
  const names = body.name.split(" ");

  const { data } = await registerUserRequest({
    password: password,
    confirmPassword: password,
    user: {
      firstName: names[0],
      lastName: names[1] || "",
      email: body.email,
    },
  });

  res.status(200).json({ user: data });
}
