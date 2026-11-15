/** @jest-environment jsdom */

import {
	ACTIVE_LANGUAGE_COOKIE_NAME,
	ACTIVE_TASK_COOKIE_NAME,
	ACTIVE_TEAM_COOKIE_NAME,
	ACTIVE_USER_ID_COOKIE_NAME,
	NO_TEAM_POPUP_SHOW_COOKIE_NAME,
	ORGANIZATION_ID_COOKIE_NAME,
	REFRESH_TOKEN_COOKIE_NAME,
	SESSION_ENDS_WITH_BROWSER_COOKIE_NAME,
	TENANT_ID_COOKIE_NAME,
	TOKEN_COOKIE_NAME
} from '@/core/constants/config/constants';
import { deleteCookie, deleteCookieCrossSite, getCookie, setCookie } from './helpers';
import {
	removeAuthCookies,
	sessionEndsWithBrowser,
	setAccessTokenCookie,
	setActiveTaskIdCookie,
	setActiveTeamIdCookie,
	setAuthCookies,
	setRefreshTokenCookie,
	setSessionEndsWithBrowser
} from './index';

jest.mock('./helpers', () => ({
	deleteCookie: jest.fn(),
	deleteCookieCrossSite: jest.fn(),
	getCookie: jest.fn(),
	setCookie: jest.fn()
}));

/** The browser's cookies as the mocked helpers read and write them, each with the options it was last written with. */
let jar: Map<string, { value: string; options: unknown }>;

const DAY_S = 24 * 60 * 60;

function nowS(): number {
	return Math.floor(Date.now() / 1000);
}

function base64Url(value: object): string {
	return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** A refresh token as Gauzy signs it, which expires at `exp` (in seconds). */
function refreshTokenExpiringAt(exp: number): string {
	const header = base64Url({ alg: 'HS256', typ: 'JWT' });
	return `${header}.${base64Url({ id: 'user-1', iat: exp - DAY_S, exp })}.signature`;
}

/** The cookies a sign-in writes: the sign-out removes them all. */
const SIGN_IN_COOKIES = [
	TOKEN_COOKIE_NAME,
	REFRESH_TOKEN_COOKIE_NAME,
	ACTIVE_TEAM_COOKIE_NAME,
	TENANT_ID_COOKIE_NAME,
	ORGANIZATION_ID_COOKIE_NAME,
	ACTIVE_LANGUAGE_COOKIE_NAME,
	NO_TEAM_POPUP_SHOW_COOKIE_NAME,
	ACTIVE_USER_ID_COOKIE_NAME
];

function signIn(refreshToken: string, accessToken = 'access-1'): void {
	setAuthCookies({
		refresh_token: { token: refreshToken },
		access_token: accessToken,
		teamId: 'team-1',
		tenantId: 'tenant-1',
		organizationId: 'organization-1',
		languageId: 'fr',
		noTeamPopup: true,
		userId: 'user-1'
	});
}

/** Each cookie named with the options it was last written with, so that a failure names the cookie. */
function optionsOf(names: string[]): [string, unknown][] {
	return names.map((name) => [name, jar.get(name)?.options]);
}

function expiringAt(names: string[], exp: number): [string, unknown][] {
	return names.map((name) => [name, { expires: new Date(exp * 1000) }]);
}

function withoutExpiry(names: string[]): [string, unknown][] {
	return names.map((name) => [name, undefined]);
}

/**
 * A write on the server, as proxy.ts and the sign-in routes make it: a NextRequest whose cookie store is the browser's
 * jar (cookies-next writes each cookie on the request as well as on the response).
 */
function serverCtx() {
	return {
		req: { cookies: { get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)?.value } : undefined) } },
		res: {}
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jar = new Map();
	// As cookies-next reads: at once in the browser, and with a promise on the server (a context with req or res)
	jest.mocked(getCookie).mockImplementation(((name: string, options?: { req?: unknown; res?: unknown }) =>
		options?.req || options?.res
			? Promise.resolve(jar.get(name)?.value)
			: jar.get(name)?.value) as unknown as typeof getCookie);
	jest.mocked(setCookie).mockImplementation((name: string, value: unknown, options: unknown) => {
		jar.set(name, { value: String(value), options });
	});
	jest.mocked(deleteCookie).mockImplementation((name: string) => {
		jar.delete(name);
	});
	jest.mocked(deleteCookieCrossSite).mockImplementation((name: string) => {
		jar.delete(name);
	});
});

describe('The cookies of a session last until its refresh token expires (#5315)', () => {
	it("writes every cookie of a sign-in with the refresh token's expiry", () => {
		const exp = nowS() + 7 * DAY_S;

		signIn(refreshTokenExpiringAt(exp));

		expect(optionsOf(SIGN_IN_COOKIES)).toEqual(expiringAt(SIGN_IN_COOKIES, exp));
	});

	it('writes a long access token in chunks that all expire with the session', () => {
		const exp = nowS() + DAY_S;
		const chunks = [`${TOKEN_COOKIE_NAME}0`, `${TOKEN_COOKIE_NAME}1`, `${TOKEN_COOKIE_NAME}_totalChunks`];

		signIn(refreshTokenExpiringAt(exp), 'x'.repeat(4097));

		expect(optionsOf(chunks)).toEqual(expiringAt(chunks, exp));
	});

	it('gives every cookie of the session the expiry of the refresh token a renewal brings', () => {
		const signedInUntil = nowS() + DAY_S;
		signIn(refreshTokenExpiringAt(signedInUntil));
		setActiveTaskIdCookie('task-1');
		const renewedUntil = signedInUntil + DAY_S / 2;
		const sessionCookies = [...SIGN_IN_COOKIES, ACTIVE_TASK_COOKIE_NAME];

		// The order of every renewal: the access token first, then the refresh token that replaces the spent one
		setAccessTokenCookie('access-2');
		setRefreshTokenCookie(refreshTokenExpiringAt(renewedUntil));

		expect(jar.get(TOKEN_COOKIE_NAME)?.value).toBe('access-2');
		expect(jar.get(ACTIVE_TASK_COOKIE_NAME)?.value).toBe('task-1');
		expect(optionsOf(sessionCookies)).toEqual(expiringAt(sessionCookies, renewedUntil));
	});

	it('gives an access token renewed without a new refresh token the expiry of the one it was renewed with', () => {
		const exp = nowS() + DAY_S;
		signIn(refreshTokenExpiringAt(exp));

		setAccessTokenCookie('access-2');

		expect(optionsOf([TOKEN_COOKIE_NAME])).toEqual(expiringAt([TOKEN_COOKIE_NAME], exp));
	});

	it('gives a cookie the session gains later the expiry of the session', () => {
		const exp = nowS() + DAY_S;
		signIn(refreshTokenExpiringAt(exp));

		setActiveTeamIdCookie('team-2');

		expect(jar.get(ACTIVE_TEAM_COOKIE_NAME)).toEqual({
			value: 'team-2',
			options: { expires: new Date(exp * 1000) }
		});
	});

	it('keeps the request and the response of a write on the server beside the expiry', () => {
		const exp = nowS() + DAY_S;
		const ctx = { req: {}, res: {} };

		setRefreshTokenCookie(refreshTokenExpiringAt(exp), ctx);

		expect(jar.get(REFRESH_TOKEN_COOKIE_NAME)?.options).toEqual({
			req: ctx.req,
			res: ctx.res,
			expires: new Date(exp * 1000)
		});
	});

	it.each([
		['cannot be read', () => 'not-a-token'],
		['has expired', () => refreshTokenExpiringAt(nowS() - 60)]
	])('leaves the cookies to the browser session, as before, for a refresh token that %s', (_, refreshToken) => {
		signIn(refreshToken());

		expect(optionsOf(SIGN_IN_COOKIES)).toEqual(withoutExpiry(SIGN_IN_COOKIES));
	});
});

describe('A browser can be set to forget the session when it closes (#5315)', () => {
	it('writes the cookies of a sign-in without expiry in a browser set so', () => {
		jar.set(SESSION_ENDS_WITH_BROWSER_COOKIE_NAME, { value: '1', options: undefined });

		signIn(refreshTokenExpiringAt(nowS() + DAY_S));

		expect(optionsOf(SIGN_IN_COOKIES)).toEqual(withoutExpiry(SIGN_IN_COOKIES));
	});

	it('applies the choice to the session already open, and gives the expiry back when it is undone', () => {
		const exp = nowS() + DAY_S;
		signIn(refreshTokenExpiringAt(exp));

		setSessionEndsWithBrowser(true);

		expect(sessionEndsWithBrowser()).toBe(true);
		expect(optionsOf(SIGN_IN_COOKIES)).toEqual(withoutExpiry(SIGN_IN_COOKIES));

		setSessionEndsWithBrowser(false);

		expect(sessionEndsWithBrowser()).toBe(false);
		expect(optionsOf(SIGN_IN_COOKIES)).toEqual(expiringAt(SIGN_IN_COOKIES, exp));
	});

	it('remembers the choice beyond the browser session, and through a sign-out', () => {
		signIn(refreshTokenExpiringAt(nowS() + DAY_S));

		setSessionEndsWithBrowser(true);
		removeAuthCookies();

		expect(jar.get(SESSION_ENDS_WITH_BROWSER_COOKIE_NAME)?.options).toEqual({ maxAge: expect.any(Number) });
		expect(sessionEndsWithBrowser()).toBe(true);
		expect(jar.has(REFRESH_TOKEN_COOKIE_NAME)).toBe(false);
	});
});

describe('A write on the server reads the cookies of the request, which cookies-next answers with a promise (#5315)', () => {
	it('gives every cookie of the session the expiry of the pair the proxy renewal brings', () => {
		const signedInUntil = nowS() + DAY_S;
		signIn(refreshTokenExpiringAt(signedInUntil));
		setActiveTaskIdCookie('task-1');
		const renewedUntil = signedInUntil + DAY_S / 2;
		const sessionCookies = [...SIGN_IN_COOKIES, ACTIVE_TASK_COOKIE_NAME];
		const ctx = serverCtx();

		// proxy.ts: the access token first, then the refresh token Gauzy rotated
		setAccessTokenCookie('access-2', ctx);
		setRefreshTokenCookie(refreshTokenExpiringAt(renewedUntil), ctx);

		expect(jar.get(TOKEN_COOKIE_NAME)?.value).toBe('access-2');
		expect(jar.get(TENANT_ID_COOKIE_NAME)?.value).toBe('tenant-1');
		expect(optionsOf(sessionCookies)).toEqual(
			sessionCookies.map((name) => [name, { ...ctx, expires: new Date(renewedUntil * 1000) }])
		);
	});

	it('gives an access token the proxy renews without a new refresh token the expiry of the session', () => {
		const exp = nowS() + DAY_S;
		signIn(refreshTokenExpiringAt(exp));
		const ctx = serverCtx();

		setAccessTokenCookie('access-2', ctx);

		expect(jar.get(TOKEN_COOKIE_NAME)?.options).toEqual({ ...ctx, expires: new Date(exp * 1000) });
	});

	it('keeps the cookies of a browser set to forget the session to the browser session, renewed by the proxy', () => {
		signIn(refreshTokenExpiringAt(nowS() + DAY_S));
		setSessionEndsWithBrowser(true);
		const ctx = serverCtx();

		setAccessTokenCookie('access-2', ctx);
		setRefreshTokenCookie(refreshTokenExpiringAt(nowS() + 2 * DAY_S), ctx);

		expect(optionsOf(SIGN_IN_COOKIES)).toEqual(SIGN_IN_COOKIES.map((name) => [name, ctx]));
	});

	it('keeps the cookies of a sign-in on the server to the browser session, in a browser set so', () => {
		jar.set(SESSION_ENDS_WITH_BROWSER_COOKIE_NAME, { value: '1', options: undefined });
		const ctx = serverCtx();

		setAuthCookies(
			{
				refresh_token: { token: refreshTokenExpiringAt(nowS() + DAY_S) },
				access_token: 'access-1',
				teamId: 'team-1',
				tenantId: 'tenant-1',
				organizationId: 'organization-1',
				languageId: 'fr',
				noTeamPopup: true,
				userId: 'user-1'
			},
			ctx
		);

		expect(sessionEndsWithBrowser(ctx)).toBe(true);
		expect(optionsOf(SIGN_IN_COOKIES)).toEqual(SIGN_IN_COOKIES.map((name) => [name, ctx]));
	});
});
