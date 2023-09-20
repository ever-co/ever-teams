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
	ACTIVE_USER_ID_COOKIE_NAME,
	MEET_JWT_TOKEN_COOKIE_NAME,
} from '@app/constants';
import { IDecodedRefreshToken } from '@app/interfaces/IAuthentication';
import { deleteCookie, getCookie, setCookie } from './helpers';
import { chunk, range } from 'lib/utils';
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
	userId: string;
};

type NextCtx = { req: NextApiRequest; res: NextApiResponse };

export const setLargeStringInCookies = (
	COOKIE_NAME: string,
	largeString: string,
	req: NextApiRequest,
	res: NextApiResponse
) => {
	const chunkSize = 4000;
	const chunks = chunk<string>(Array.from(largeString), chunkSize);

	chunks.forEach((chunk, index) => {
		const cookieValue = chunk.join('');

		setCookie(`${COOKIE_NAME}${index}`, cookieValue, { res, req });
	});
	setCookie(`${COOKIE_NAME}_totalChunks`, chunks.length, { res, req });
};

export const getLargeStringFromCookies = (
	COOKIE_NAME: string,
	ctx?: NextCtx
) => {
	const totalChunksCookie = getTotalChunksCookie(COOKIE_NAME, ctx);
	if (!totalChunksCookie) {
		return null; // Total chunks cookie not found.
	}

	const totalChunks = parseInt(totalChunksCookie);

	const chunks = range(totalChunks).map((index) => {
		const chunkCookie = getCookie(`${COOKIE_NAME}${index}`, ctx);
		if (!chunkCookie) {
			return null; // Chunk cookie not found.
		}

		return chunkCookie;
	});

	// Concatenate and return the large string.
	return chunks.join('');
};

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
		userId,
	} = datas;

	// const expires = addHours(6, changeTimezone(new Date(), timezone));

	// Handle Large Access Token
	// Cookie can support upto 4096 characters only!
	if (access_token.length <= 4096) {
		setCookie(TOKEN_COOKIE_NAME, access_token, { res, req });
	} else {
		setLargeStringInCookies(TOKEN_COOKIE_NAME, access_token, req, res);
	}

	setCookie(REFRESH_TOKEN_COOKIE_NAME, refresh_token.token, { res, req });
	setCookie(ACTIVE_TEAM_COOKIE_NAME, teamId, { res, req });
	setCookie(TENANT_ID_COOKIE_NAME, tenantId, { res, req });
	setCookie(ORGANIZATION_ID_COOKIE_NAME, organizationId, { res, req });
	setCookie(ACTIVE_LANGUAGE_COOKIE_NAME, languageId, { res, req });
	setCookie(NO_TEAM_POPUP_SHOW_COOKIE_NAME, noTeamPopup, { res, req });
	setCookie(ACTIVE_USER_ID_COOKIE_NAME, userId, { res, req });
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
		ACTIVE_USER_TASK_COOKIE_NAME,
		ACTIVE_USER_ID_COOKIE_NAME,
	];
}

export function removeAuthCookies() {
	cookiesKeys().forEach((key) => deleteCookie(key));

	const totalChunksCookie = getTotalChunksCookie(TOKEN_COOKIE_NAME);
	if (totalChunksCookie) {
		const totalChunks = parseInt(totalChunksCookie);
		range(totalChunks).map((index) => {
			deleteCookie(`${TOKEN_COOKIE_NAME}${index}`);
		});
	}
	deleteCookie(`${TOKEN_COOKIE_NAME}_totalChunks`);
}

// Access Token
export function getAccessTokenCookie(ctx?: NextCtx) {
	const totalChunksCookie = getTotalChunksCookie(TOKEN_COOKIE_NAME, ctx);
	if (totalChunksCookie) {
		return getLargeStringFromCookies(TOKEN_COOKIE_NAME, ctx); // Total chunks cookie not found.
	}

	return getCookie(TOKEN_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

export function getTotalChunksCookie(COOKIE_NAME: string, ctx?: NextCtx) {
	return getCookie(`${COOKIE_NAME}_totalChunks`, {
		...(ctx || {}),
	}) as string;
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

// Active userId
export function getActiveUserIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_USER_ID_COOKIE_NAME, { ...(ctx || {}) }) as string;
}

export function setActiveUserIdCookie(userId: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_USER_ID_COOKIE_NAME, userId, { ...(ctx || {}) });
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
	} catch (_) {
		/* empty */
	}

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

// Jitsi
export function setMeetJwtSessionCookie(token: string, ctx?: NextCtx) {
	return setCookie(MEET_JWT_TOKEN_COOKIE_NAME, token, { ...(ctx || {}) });
}
export function getMeetJwtSessionCookie(ctx?: NextCtx) {
	return getCookie(MEET_JWT_TOKEN_COOKIE_NAME, { ...(ctx || {}) }) as string;
}
