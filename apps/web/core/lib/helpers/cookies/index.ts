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
	ACTIVE_PROJECT_COOKIE_NAME
} from '@/core/constants/config/constants';
import { IDecodedRefreshToken } from '@/core/types/interfaces/auth/auth';
import { deleteCookie, getCookie, setCookie, deleteCookieCrossSite as _deleteCookieCrossSite } from './helpers';
import { chunk, range } from '@/core/lib/helpers';
import { tokenCookieChunkCount } from './token-chunks';

// Re-export for use in other modules
export const deleteCookieCrossSite = _deleteCookieCrossSite;

type NextCtx = {
	req: any;
	res: any;
};

export const ACCESS_TOKEN_REFRESHED_EVENT = 'ever-teams:access-token-refreshed';

/**
 * Clears all existing chunks for a given cookie name.
 * This prevents cookie duplication when setting new chunked cookies.
 *
 * @param COOKIE_NAME - The base cookie name (e.g., 'auth-token')
 * @param ctx - Optional Next.js context for server-side cookie operations
 * @param crossSite - Whether to also delete cross-site cookies (with domain attribute)
 */
const clearExistingChunks = (COOKIE_NAME: string, ctx: NextCtx | undefined, crossSite = false) => {
	const deleteChunkCookie = (name: string) => {
		if (crossSite) {
			deleteCookieCrossSite(name, ctx ? { req: ctx.req, res: ctx.res } : undefined);
		} else {
			deleteCookie(name, ctx ? { req: ctx.req, res: ctx.res } : undefined);
		}
	};

	// Get the total chunks cookie to know how many chunks exist
	const totalChunksValue = getCookie(`${COOKIE_NAME}_totalChunks`, ctx);

	if (totalChunksValue) {
		// Delete all existing chunk cookies; a count no sign-in writes names none
		const totalChunks = tokenCookieChunkCount(totalChunksValue);
		if (totalChunks) {
			range(totalChunks).forEach((index) => deleteChunkCookie(`${COOKIE_NAME}${index}`));
		}

		// Delete the totalChunks cookie
		deleteChunkCookie(`${COOKIE_NAME}_totalChunks`);
	}

	// Also delete the base cookie in case the previous token was not chunked
	if (crossSite) {
		deleteCookieCrossSite(COOKIE_NAME, ctx ? { req: ctx.req, res: ctx.res } : undefined);
	} else {
		deleteCookie(COOKIE_NAME, ctx ? { req: ctx.req, res: ctx.res } : undefined);
	}
};

export type CookiesDataType = {
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

export const setLargeStringInCookies = (
	COOKIE_NAME: string,
	largeString: string,
	ctx: NextCtx | undefined,
	crossSite = false
) => {
	// Clear any existing chunks before setting new ones to prevent duplication
	clearExistingChunks(COOKIE_NAME, ctx, crossSite);

	const chunkSize = 4000;
	const chunks = chunk<string>(Array.from(largeString), chunkSize);

	chunks.forEach((chunk, index) => {
		const cookieValue = chunk.join('');

		setCookie(`${COOKIE_NAME}${index}`, cookieValue, ctx, crossSite);
	});

	setCookie(`${COOKIE_NAME}_totalChunks`, String(chunks.length), ctx, crossSite);
};

export const getLargeStringFromCookies = (COOKIE_NAME: string, ctx?: NextCtx) => {
	const totalChunks = tokenCookieChunkCount(getTotalChunksCookie(COOKIE_NAME, ctx));
	if (!totalChunks) {
		return null; // No chunk count, or not one a sign-in writes.
	}

	const chunks: string[] = [];
	for (const index of range(totalChunks)) {
		const chunkCookie = getCookie(`${COOKIE_NAME}${index}`, ctx);
		if (typeof chunkCookie !== 'string' || !chunkCookie) {
			return null; // A missing chunk leaves no usable string.
		}
		chunks.push(chunkCookie);
	}

	// Concatenate and return the large string.
	return chunks.join('');
};

export function setAuthCookies(datas: CookiesDataType, ctx?: NextCtx) {
	const {
		refresh_token,
		access_token,
		tenantId,
		teamId,
		organizationId,
		languageId,
		// timezone,
		noTeamPopup,
		userId
	} = datas;

	// const expires = addHours(6, changeTimezone(new Date(), timezone));

	// Handle Large Access Token
	// Cookie can support upto 4096 characters only!
	if (access_token.length <= 4096) {
		// Clear any existing chunks before setting a non-chunked token
		// This handles the case where the previous token was chunked but the new one fits in a single cookie
		clearExistingChunks(TOKEN_COOKIE_NAME, ctx, true);
		setCookie(TOKEN_COOKIE_NAME, access_token, ctx, true); // cross site cookie
	} else {
		// setLargeStringInCookies already calls clearExistingChunks internally
		setLargeStringInCookies(TOKEN_COOKIE_NAME, access_token, ctx, true); // cross site cookie
	}

	setCookie(REFRESH_TOKEN_COOKIE_NAME, refresh_token.token, ctx); // cross site cookie
	setCookie(ACTIVE_TEAM_COOKIE_NAME, teamId, ctx);
	setCookie(TENANT_ID_COOKIE_NAME, tenantId, ctx);
	setCookie(ORGANIZATION_ID_COOKIE_NAME, organizationId, ctx);
	setCookie(ACTIVE_LANGUAGE_COOKIE_NAME, languageId, ctx);
	setCookie(NO_TEAM_POPUP_SHOW_COOKIE_NAME, noTeamPopup, ctx);
	setCookie(ACTIVE_USER_ID_COOKIE_NAME, userId, ctx);
	// A sign-in in this tab: it works in the session it just opened
	tabSessionReplaced(ctx);
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
		ACTIVE_USER_ID_COOKIE_NAME
	];
}

/**
 * Delete access token cookie (single or chunked) through deleteCookieCrossSite,
 * which uses the same attributes setCookie writes the token with
 */
function deleteAccessTokenCookie() {
	const totalChunksCookie = getTotalChunksCookie(TOKEN_COOKIE_NAME);

	// Delete chunked access tokens if they exist
	if (totalChunksCookie) {
		// A count no sign-in writes names no chunk to delete
		range(tokenCookieChunkCount(totalChunksCookie) ?? 0).forEach((index) => {
			deleteCookieCrossSite(`${TOKEN_COOKIE_NAME}${index}`);
		});
		deleteCookieCrossSite(`${TOKEN_COOKIE_NAME}_totalChunks`);
	} else {
		// Delete single access token
		deleteCookieCrossSite(TOKEN_COOKIE_NAME);
	}
}

export function removeAuthCookies() {
	// Delete other auth cookies (without cross-site attributes)
	cookiesKeys().forEach((key) => deleteCookie(key));

	// Delete access token with cross-site attributes
	deleteAccessTokenCookie();
	// A sign-out in this tab: nothing of the session stays in its memory
	tabSessionReplaced();
}

// Access Token
function nonEmptyStringOrNull(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}
	if (value.length === 0) {
		return null;
	}
	return value;
}

function readAccessTokenCookie(ctx?: NextCtx): string | null {
	const totalChunksCookie = getTotalChunksCookie(TOKEN_COOKIE_NAME, ctx);
	if (totalChunksCookie) {
		const full = getLargeStringFromCookies(TOKEN_COOKIE_NAME, ctx);
		return nonEmptyStringOrNull(full);
	}

	const single = getCookie(TOKEN_COOKIE_NAME, ctx);
	return nonEmptyStringOrNull(single);
}

// Read on almost every render; in the browser the result depends only on the cookie string, so it is kept
// until that string changes.
let lastCookieString: string | null = null;
let lastAccessToken: string | null = null;

export function getAccessTokenCookie(ctx?: NextCtx): string | null {
	const isBrowserRead = !ctx && typeof document !== 'undefined';
	if (!isBrowserRead) {
		return readAccessTokenCookie(ctx);
	}
	const cookieString = document.cookie;
	if (cookieString === lastCookieString) {
		return lastAccessToken;
	}
	const accessToken = readAccessTokenCookie();
	lastCookieString = cookieString;
	lastAccessToken = accessToken;
	return accessToken;
}

export function getTotalChunksCookie(COOKIE_NAME: string, ctx?: NextCtx) {
	return getCookie(`${COOKIE_NAME}_totalChunks`, ctx) as string;
}

// Refresh Token
export function getRefreshTokenCookie(ctx?: NextCtx) {
	return getCookie(REFRESH_TOKEN_COOKIE_NAME, ctx) as string;
}

export function setRefreshTokenCookie(refreshToken: string, ctx?: NextCtx) {
	return setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, ctx);
}

export function setAccessTokenCookie(accessToken: string, ctx?: NextCtx) {
	// Handle Large Access Token
	// Cookie can support upto 4096 characters only!
	if (accessToken.length <= 4096) {
		// Clear any existing chunks before setting a non-chunked token
		// This handles the case where the previous token was chunked but the new one fits in a single cookie
		clearExistingChunks(TOKEN_COOKIE_NAME, ctx, true);
		setCookie(TOKEN_COOKIE_NAME, accessToken, ctx, true); // cross site cookie
	} else {
		// setLargeStringInCookies already calls clearExistingChunks internally
		setLargeStringInCookies(TOKEN_COOKIE_NAME, accessToken, ctx, true); // cross site cookie
	}

	// Fast, scope-pinned API owners need to replace their Authorization token after
	// every client-side refresh, regardless of which refresh flow wrote the cookie.
	if (!ctx && typeof window !== 'undefined') {
		window.dispatchEvent(new Event(ACCESS_TOKEN_REFRESHED_EVENT));
	}
}

/**
 * The organization and team a tab works in while the cookies, shared by every tab, name another organization of the
 * session (another tab switched to it): read from tab-organization.ts, which registers itself here, in the browser only.
 */
interface TabWorkScope {
	organizationId: string;
	teamId: string | null;
	projectId: string | null;
}

let readTabWorkScope: (() => TabWorkScope | null) | null = null;
let onTabSessionReplaced: (() => void) | null = null;
let onTabProjectChosen: ((projectId: string | null) => void) | null = null;

/**
 * Registers what a tab works in (tab-organization.ts). `onSessionReplaced` runs when this tab signs in or out, so it
 * starts again from the cookies; `onProjectChosen` keeps each project this tab chooses, so that it still files its tasks
 * under it once another tab moves the cookies to another organization (the project cookie is then the other tab's).
 */
export function registerTabWorkScope(
	reader: () => TabWorkScope | null,
	onSessionReplaced: () => void,
	onProjectChosen?: (projectId: string | null) => void
): void {
	readTabWorkScope = reader;
	onTabSessionReplaced = onSessionReplaced;
	onTabProjectChosen = onProjectChosen ?? null;
}

/** This tab's own organization and team when they are not the cookies', in the browser; null otherwise. */
function tabWorkScope(ctx?: NextCtx): TabWorkScope | null {
	if (ctx || typeof window === 'undefined' || !readTabWorkScope) return null;
	return readTabWorkScope();
}

function tabSessionReplaced(ctx?: NextCtx): void {
	if (!ctx && typeof window !== 'undefined') onTabSessionReplaced?.();
}

// Active team id
/**
 * The team this tab works in: the cookie's, or this tab's own while another tab has the cookies on another organization
 * (tab-organization.ts). The cookie itself is shared by every tab: getSharedActiveTeamIdCookie.
 */
export function getActiveTeamIdCookie(ctx?: NextCtx) {
	return tabWorkScope(ctx)?.teamId || getSharedActiveTeamIdCookie(ctx);
}

/** The team cookie, shared by every tab of the browser. */
function getSharedActiveTeamIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_TEAM_COOKIE_NAME, ctx) as string;
}

export function setActiveTeamIdCookie(teamIds: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_TEAM_COOKIE_NAME, teamIds, ctx);
}

// Active Project id
/**
 * The project this tab files new tasks under: the cookie's, or its own team's while another tab has the cookies on
 * another organization (tab-organization.ts): the cookie then names a project of that other organization.
 */
export function getActiveProjectIdCookie(ctx?: NextCtx) {
	const tab = tabWorkScope(ctx);
	if (tab) return tab.projectId ?? '';
	return getCookie(ACTIVE_PROJECT_COOKIE_NAME, ctx) as string;
}

export function setActiveProjectIdCookie(teamIds: string, ctx?: NextCtx) {
	// This tab keeps the project it chose, before the cookies move to another organization too (CodeRabbit on #5321)
	if (!ctx && typeof window !== 'undefined') onTabProjectChosen?.(teamIds || null);
	// A tab working in its own organization keeps its project to itself: the cookie is the other tab's
	if (tabWorkScope(ctx)) return;
	return setCookie(ACTIVE_PROJECT_COOKIE_NAME, teamIds, ctx);
}

// Organization Id
/**
 * The organization this tab works in: the cookie's, or this tab's own while another tab has the cookies on another
 * organization of the session (tab-organization.ts). The cookie itself is shared: getSharedOrganizationIdCookie.
 */
export function getOrganizationIdCookie(ctx?: NextCtx) {
	return tabWorkScope(ctx)?.organizationId || getSharedOrganizationIdCookie(ctx);
}

/** The organization cookie, shared by every tab of the browser. */
export function getSharedOrganizationIdCookie(ctx?: NextCtx) {
	return getCookie(ORGANIZATION_ID_COOKIE_NAME, ctx) as string;
}

export function setOrganizationIdCookie(orgId: string, ctx?: NextCtx) {
	return setCookie(ORGANIZATION_ID_COOKIE_NAME, orgId, ctx);
}

// Tenant Id
export function getTenantIdCookie(ctx?: NextCtx) {
	return getCookie(TENANT_ID_COOKIE_NAME, ctx) as string;
}

// Active tasks

export function getActiveTaskIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_TASK_COOKIE_NAME, ctx) as string;
}

export function setActiveTaskIdCookie(taskId: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_TASK_COOKIE_NAME, taskId, ctx);
}

// Active userId
export function getActiveUserIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_USER_ID_COOKIE_NAME, ctx) as string;
}

export function setActiveUserIdCookie(userId: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_USER_ID_COOKIE_NAME, userId, ctx);
}

export function getNoTeamPopupShowCookie(ctx?: NextCtx) {
	return !!getCookie(NO_TEAM_POPUP_SHOW_COOKIE_NAME, ctx);
}
export function setNoTeamPopupShowCookie(show: boolean, ctx?: NextCtx) {
	return setCookie(NO_TEAM_POPUP_SHOW_COOKIE_NAME, show, ctx);
}

export function setActiveUserTaskCookie(data: { taskId: string; userId: string }, ctx?: NextCtx) {
	return setCookie(ACTIVE_USER_TASK_COOKIE_NAME, JSON.stringify(data), ctx);
}

export function getActiveUserTaskCookie(ctx?: NextCtx) {
	const data = getCookie(ACTIVE_USER_TASK_COOKIE_NAME, ctx);

	try {
		return JSON.parse(data as string) as { taskId: string; userId: string };
	} catch (_) {
		/* empty */
	}

	return null;
}

// Active language id
export function getActiveLanguageIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_LANGUAGE_COOKIE_NAME, ctx) as string;
}

export function setActiveLanguageIdCookie(languageIds: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_LANGUAGE_COOKIE_NAME, languageIds, ctx);
}

// Timezone
export function setActiveTimezoneCookie(timezone: string, ctx?: NextCtx) {
	return setCookie(ACTIVE_TIMEZONE_COOKIE_NAME, timezone, ctx);
}
export function getActiveTimezoneIdCookie(ctx?: NextCtx) {
	return getCookie(ACTIVE_TIMEZONE_COOKIE_NAME, ctx) as string;
}

// Jitsi
export function setMeetJwtSessionCookie(token: string, ctx?: NextCtx) {
	return setCookie(MEET_JWT_TOKEN_COOKIE_NAME, token, ctx);
}
export function getMeetJwtSessionCookie(ctx?: NextCtx) {
	return getCookie(MEET_JWT_TOKEN_COOKIE_NAME, ctx) as string;
}
