import { TOKEN_COOKIE_NAME } from "@app/constants";
import { getCookie } from "cookies-next";
import { NextApiRequest, NextApiResponse } from "next";
import { currentAuthenticatedUserRequest } from "../requests/auth";

export async function authenticatedGuard(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const access_token = getCookie(TOKEN_COOKIE_NAME, { req, res });

  const r_res = await currentAuthenticatedUserRequest(
    access_token?.toString() || ""
  ).catch(console.error);

  if (!r_res) {
    res.status(401);
    return {
      $res: () => res.json({ statusCode: 401, message: "Unauthorized" }),
      user: null,
    };
  }

  return {
    $res: res,
    user: r_res.data,
    access_token: access_token as string,
  };
}
