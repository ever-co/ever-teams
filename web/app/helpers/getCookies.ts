import { TOKEN_COOKIE_NAME } from "@app/constants";
import cookie from "js-cookie";
import { ITokens } from "../interfaces/IUserData";

export const getCookies = (): ITokens | null => {
  const token = cookie.get(TOKEN_COOKIE_NAME);
  if (token) return { token };

  return null;
};

export const removeCookies = () => {
  cookie.remove(TOKEN_COOKIE_NAME);
};
