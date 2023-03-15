import {
	ACTIVE_TEAM_COOKIE_NAME,
	ORGANIZATION_ID_COOKIE_NAME,
	REFRESH_TOKEN_COOKIE_NAME,
	TENANT_ID_COOKIE_NAME,
	TOKEN_COOKIE_NAME,
	ACTIVE_TASK_COOKIE_NAME,
	ACTIVE_LANGUAGE_COOKIE_NAME,
	ACTIVE_TIMEZONE_COOKIE_NAME,
	ACTIVE_USER_TASK_COOKIE_NAME,
	NO_TEAM_POPUP_SHOW_COOKIE_NAME,
} from '@app/constants';
import { IDecodedRefreshToken } from '@app/interfaces/IAuthentication';
import { deleteCookie, getCookie, setCookie } from 'cookies-next';
import { NextApiRequest, NextApiResponse } from 'next';

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
	languageId: string;
	noTeamPopup?: boolean;
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
		languageId,
		// timezone,
		noTeamPopup,
	} = datas;

	// const expires = addHours(6, changeTimezone(new Date(), timezone));

	setCookie(REFRESH_TOKEN_COOKIE_NAME, refresh_token.token, { res, req });
	setCookie(TOKEN_COOKIE_NAME, access_token, { res, req });
	setCookie(ACTIVE_TEAM_COOKIE_NAME, teamId, { res, req });
	setCookie(TENANT_ID_COOKIE_NAME, tenantId, { res, req });
	setCookie(ORGANIZATION_ID_COOKIE_NAME, organizationId, { res, req });
	setCookie(ACTIVE_LANGUAGE_COOKIE_NAME, languageId, { res, req });
	setCookie(NO_TEAM_POPUP_SHOW_COOKIE_NAME, noTeamPopup, { res, req });
}

export function cookiesKeys() {
	return [
		REFRESH_TOKEN_COOKIE_NAME,
		TOKEN_COOKIE_NAME,
		ACTIVE_TEAM_COOKIE_NAME,
		TENANT_ID_COOKIE_NAME,
		ORGANIZATION_ID_COOKIE_NAME,
		ACTIVE_TASK_COOKIE_NAME,
		ACTIVE_LANGUAGE_COOKIE_NAME,
		NO_TEAM_POPUP_SHOW_COOKIE_NAME,
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

export function getNoTeamPopupShowCookie(ctx?: NextCtx) {
	return getCookie(NO_TEAM_POPUP_SHOW_COOKIE_NAME, {
		...(ctx || {}),
	}) as boolean;
}
export function setNoTeamPopupShowCookie(show: boolean, ctx?: NextCtx) {
	return setCookie(NO_TEAM_POPUP_SHOW_COOKIE_NAME, show, { ...(ctx || {}) });
}

export function setActiveUserTaskCookie(
	data: { taskId: string; userId: string },
	ctx?: NextCtx
) {
	return setCookie(ACTIVE_USER_TASK_COOKIE_NAME, JSON.stringify(data), {
		...(ctx || {}),
	});
}

export function getActiveUserTaskCookie(ctx?: NextCtx) {
	const data = getCookie(ACTIVE_USER_TASK_COOKIE_NAME, {
		...(ctx || {}),
	});

	try {
		return JSON.parse(data as string) as { taskId: string; userId: string };
	} catch (_) {}

	return null;
}

// Active language id
export function getActiveLanguageIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_LANGUAGE_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

export function setActiveLanguageIdCookie(languageIds: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_LANGUAGE_COOKIE_NAME, languageIds, {
		...(ctx || {}),
	});
}

// Timezone
export function setActiveTimezoneCookie(timezone: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_TIMEZONE_COOKIE_NAME, timezone, { ...(ctx || {}) });
}
export function getActiveTimezoneIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_TIMEZONE_COOKIE_NAME, { ...(ctx || {}) }) as string;
}
