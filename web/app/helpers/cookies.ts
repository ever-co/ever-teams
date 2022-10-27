import {
  ACTIVE_TEAM_COOKIE_NAME,
  ORGANIZATION_ID_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  TENANT_ID_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@app/constants";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { NextApiRequest, NextApiResponse } from "next";

type DataParams = {
  refresh_token: string;
  access_token: string;
  teamId: string;
  tenantId: string;
  organizationId: string;
};

type NextCtx = { req: NextApiRequest; res: NextApiResponse };

export function setAuthCookies(
  datas: DataParams,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { refresh_token, access_token, tenantId, teamId, organizationId } =
    datas;

  setCookie(REFRESH_TOKEN_COOKIE_NAME, refresh_token, { res, req });
  setCookie(TOKEN_COOKIE_NAME, access_token, { res, req });
  setCookie(ACTIVE_TEAM_COOKIE_NAME, teamId, { res, req });
  setCookie(TENANT_ID_COOKIE_NAME, tenantId, { res, req });
  setCookie(ORGANIZATION_ID_COOKIE_NAME, organizationId, { res, req });
}

export function removeAuthCookies() {
  deleteCookie(REFRESH_TOKEN_COOKIE_NAME);
  deleteCookie(TOKEN_COOKIE_NAME);
  deleteCookie(ACTIVE_TEAM_COOKIE_NAME);
  deleteCookie(TENANT_ID_COOKIE_NAME);
  deleteCookie(ORGANIZATION_ID_COOKIE_NAME);
}

export function getActiveTeamIdCookie(ctx?: NextCtx) {
  return getCookie(ACTIVE_TEAM_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

export function getOrganizationIdCookie(ctx: NextCtx) {
  return getCookie(ORGANIZATION_ID_COOKIE_NAME, { ...ctx }) as string;
}

export function getTenantIdCookie(ctx: NextCtx) {
  return getCookie(TENANT_ID_COOKIE_NAME, { ...ctx }) as string;
}
