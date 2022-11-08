import { setAccessTokenCookie } from "@app/helpers/cookies";
import { hasErrors } from "@app/helpers/validations";
import {
  currentAuthenticatedUserRequest,
  refreshTokenRequest,
} from "@app/services/server/requests/auth";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405);
  }

  const body = req.body as { refresh_token: string } | null;
  const refresh_token = body?.refresh_token;

  if (!refresh_token || refresh_token.trim().length < 2) {
    res.status(401).json(
      hasErrors({
        refresh_token: "The refresh token must be provided on the request body",
      })
    );
    return;
  }

  const { data } = await refreshTokenRequest(refresh_token);

  const { data: user } = await currentAuthenticatedUserRequest({
    bearer_token: data.token,
  });

  setAccessTokenCookie(data.token, { res, req });

  res.status(200).json({ user, token: data.token });
}
