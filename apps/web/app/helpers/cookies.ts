import {
  ACTIVE_TEAM_COOKIE_NAME,
  ORGANIZATION_ID_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  TENANT_ID_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
  ACTIVE_TASK_COOKIE_NAME,
} from "@app/constants";
import { IDecodedRefreshToken } from "@app/interfaces/IAuthentication";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { NextApiRequest, NextApiResponse } from "next";

type DataParams = {
  refresh_token: {
    token: string;
    decoded?: IDecodedRefreshToken;
  };
  access_token: string;
  teamId: string;
  tenantId: string;
  organizationId: string;
  timezone?: string;
};

type NextCtx = { req: NextApiRequest; res: NextApiResponse };

export function setAuthCookies(
  datas: DataParams,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    refresh_token,
    access_token,
    tenantId,
    teamId,
    organizationId,
    // timezone,
  } = datas;

  // const expires = addHours(6, changeTimezone(new Date(), timezone));

  setCookie(REFRESH_TOKEN_COOKIE_NAME, refresh_token.token, { res, req });
  setCookie(TOKEN_COOKIE_NAME, access_token, { res, req });
  setCookie(ACTIVE_TEAM_COOKIE_NAME, teamId, { res, req });
  setCookie(TENANT_ID_COOKIE_NAME, tenantId, { res, req });
  setCookie(ORGANIZATION_ID_COOKIE_NAME, organizationId, { res, req });
}

export function cookiesKeys() {
  return [
    REFRESH_TOKEN_COOKIE_NAME,
    TOKEN_COOKIE_NAME,
    ACTIVE_TEAM_COOKIE_NAME,
    TENANT_ID_COOKIE_NAME,
    ORGANIZATION_ID_COOKIE_NAME,
    ACTIVE_TASK_COOKIE_NAME,
  ];
}

export function removeAuthCookies() {
  cookiesKeys().forEach((key) => deleteCookie(key));
}

// Access Token
export function getAccessTokenCookie(ctx?: NextCtx) {
  return getCookie(TOKEN_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

// Refresh Token
export function getRefreshTokenCookie(ctx?: NextCtx) {
  return getCookie(REFRESH_TOKEN_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

export function setAccessTokenCookie(accessToken: string, ctx?: NextCtx) {
  return setCookie(TOKEN_COOKIE_NAME, accessToken, { ...(ctx || {}) });
}

// Active team id
export function getActiveTeamIdCookie(ctx?: NextCtx) {
  return getCookie(ACTIVE_TEAM_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

export function setActiveTeamIdCookie(teamIds: string, ctx?: NextCtx) {
  return setCookie(ACTIVE_TEAM_COOKIE_NAME, teamIds, { ...(ctx || {}) });
}

// Organization Id
export function getOrganizationIdCookie(ctx: NextCtx) {
  return getCookie(ORGANIZATION_ID_COOKIE_NAME, { ...ctx }) as string;
}

export function setOrganizationIdCookie(orgId: string, ctx?: NextCtx) {
  return setCookie(ORGANIZATION_ID_COOKIE_NAME, orgId, { ...(ctx || {}) });
}

// Tenant Id
export function getTenantIdCookie(ctx: NextCtx) {
  return getCookie(TENANT_ID_COOKIE_NAME, { ...ctx }) as string;
}

// Active tasks

export function getActiveTaskIdCookie(ctx?: NextCtx) {
  return getCookie(ACTIVE_TASK_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

export function setActiveTaskIdCookie(taskId: string, ctx?: NextCtx) {
  return setCookie(ACTIVE_TASK_COOKIE_NAME, taskId, { ...(ctx || {}) });
}
