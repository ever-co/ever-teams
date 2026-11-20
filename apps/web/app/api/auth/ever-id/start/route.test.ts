/**
 * GET /api/auth/ever-id/start: a link that begins "Login with Ever ID" directly.
 *
 * Pinned, for each of its outcomes:
 *
 *  - **off** (the default), not a link, or Ever ID not offered on the sign-in page: `404`, and with the switch off
 *    nothing is read and nothing is called;
 *  - **on, signed out**: the sign-in the "Login with Ever ID" button starts (the same next-auth `signIn`, the same
 *    provider and landing page), then the issuer's authorization address; the return path waits in its own cookie;
 *  - **on, signed in**: straight to the destination, no sign-in;
 *  - **the sign-in cannot start**: the sign-in error page, with a code only.
 *
 * And for every answer: `Cache-Control: no-store`, the sign-in page's Referrer-Policy, and no address that carries a
 * token or the sign-in's `state`.
 */

const mockSignIn = jest.fn();

jest.mock('@/auth', () => ({ signIn: (...args: unknown[]) => mockSignIn(...args) }));

// No top-level import in this file: keep it a module so its consts stay file-scoped.
export {};

type RouteModule = typeof import('./route');

const ORIGIN = 'https://teams.example.test';
const AUTHORIZATION_URL =
	'https://id.example.test/oauth/v2/authorize?client_id=teams-web-client&state=state-SECRET&code_challenge=challenge&nonce=nonce-SECRET';
const NAVIGATION = { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Site': 'cross-site' };

const EVER_ID_ENV = {
	NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID',
	EVER_ID_ISSUER_URL: 'https://id.example.test',
	EVER_ID_CLIENT_ID: 'teams-web-client',
	EVER_ID_CLIENT_SECRET: 'teams-web-secret',
	GAUZY_API_SERVER_URL: 'https://api.example.test'
};
const SWITCH_ON = { EVER_ID_START_ROUTE_ENABLED: 'true' };
const CLEARED_KEYS = [
	...Object.keys(EVER_ID_ENV),
	'EVER_ID_START_ROUTE_ENABLED',
	'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
	'NEXT_PUBLIC_DEMO',
	'AUTH_URL',
	'NEXTAUTH_URL'
];
const ORIGINAL_ENV = { ...process.env };

let info: jest.SpyInstance;
let warn: jest.SpyInstance;
let error: jest.SpyInstance;

beforeEach(() => {
	mockSignIn.mockReset();
	mockSignIn.mockResolvedValue(AUTHORIZATION_URL);
	info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
	warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
	process.env = { ...ORIGINAL_ENV };
});

/** The route as a server start with `env` loads it (the Ever ID settings are read when the modules load). */
function loadRoute(env: Record<string, string> = { ...EVER_ID_ENV, ...SWITCH_ON }): RouteModule {
	for (const key of CLEARED_KEYS) delete process.env[key];
	Object.assign(process.env, env);
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		mod = jest.requireActual<RouteModule>('./route');
	});
	return mod as RouteModule;
}

const encodePart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An access token as the app reads it (the signature is never checked here), expiring `inSeconds` from now. */
function accessToken(inSeconds: number): string {
	const now = Math.floor(Date.now() / 1000);
	const payload = { id: 'user-1', iat: now - 60, exp: now + inSeconds };
	return `${encodePart({ alg: 'HS256', typ: 'JWT' })}.${encodePart(payload)}.signature`;
}

/** The outcome lines the route logged (other modules may log while they load). */
function outcomeLines(spy: jest.SpyInstance): string[] {
	return spy.mock.calls.map(([line]) => String(line)).filter((line) => line.startsWith('ever_id.start '));
}

function get(
	search = '',
	{
		headers = NAVIGATION,
		cookie,
		method = 'GET'
	}: { headers?: Record<string, string>; cookie?: string; method?: string } = {}
): Request {
	return new Request(`${ORIGIN}/api/auth/ever-id/start${search}`, {
		method,
		headers: { ...headers, ...(cookie ? { cookie } : {}) }
	});
}

/** Every answer of the route: never stored, and the sign-in page's Referrer-Policy. */
function expectRouteHeaders(response: Response) {
	expect(response.headers.get('cache-control')).toBe('no-store');
	expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
}

function expectNotFound(response: Response) {
	expect(response.status).toBe(404);
	expect(response.headers.get('location')).toBeNull();
	expect(response.body).toBeNull();
	expectRouteHeaders(response);
	// Nothing was started.
	expect(mockSignIn).not.toHaveBeenCalled();
}

/** The `Set-Cookie` of the return-path cookie the answer carries, or `undefined`. */
function returnCookie(response: Response): string | undefined {
	return response.headers.getSetCookie().find((cookie) => cookie.startsWith('ever-id-start-return='));
}

function expectRedirect(response: Response, location: string) {
	expect(response.status).toBe(307);
	expect(response.headers.get('location')).toBe(location);
	expectRouteHeaders(response);
}

describe('GET /api/auth/ever-id/start: off, the address does not exist', () => {
	it.each([
		['unset', {}],
		['false', { EVER_ID_START_ROUTE_ENABLED: 'false' }],
		['1', { EVER_ID_START_ROUTE_ENABLED: '1' }],
		['yes', { EVER_ID_START_ROUTE_ENABLED: 'yes' }],
		['empty', { EVER_ID_START_ROUTE_ENABLED: '' }]
	])('switch %s: 404, and nothing is read or called', async (_label, env) => {
		const route = loadRoute({ ...EVER_ID_ENV, ...env });
		const headers = jest.spyOn(Headers.prototype, 'get');

		expectNotFound(await route.GET(get('?return=/task/42', { cookie: `auth-token=${accessToken(3600)}` })));

		// Not even the request's cookies.
		expect(headers.mock.calls.map(([name]) => name.toLowerCase())).not.toContain('cookie');
		expect(outcomeLines(info)).toEqual([]);
	});

	it('switch on, Ever ID not configured: 404, for a signed-in person too', async () => {
		const route = loadRoute(SWITCH_ON);

		expectNotFound(await route.GET(get()));
		expectNotFound(await route.GET(get('', { cookie: `auth-token=${accessToken(3600)}` })));
	});

	it.each([
		['a blank app name', { NEXT_PUBLIC_EVER_ID_APP_NAME: ' ' }],
		['an issuer that is not https', { EVER_ID_ISSUER_URL: 'http://id.example.test' }],
		['no explicitly configured API', { GAUZY_API_SERVER_URL: '' }]
	])('switch on, Ever ID off with %s: 404', async (_label, override) => {
		const route = loadRoute({ ...EVER_ID_ENV, ...SWITCH_ON, ...override });

		expectNotFound(await route.GET(get()));
	});

	it('switch on, demo mode (the sign-in page shows no Ever ID button): 404', async () => {
		const route = loadRoute({ ...EVER_ID_ENV, ...SWITCH_ON, NEXT_PUBLIC_DEMO: 'true' });

		expectNotFound(await route.GET(get()));
	});
});

describe('GET /api/auth/ever-id/start: only a person following a link', () => {
	it.each([
		['a fetch', { 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty' }],
		['an image', { 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Dest': 'image' }],
		['a frame', { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'iframe' }],
		['a prefetch', { ...NAVIGATION, 'Sec-Purpose': 'prefetch' }]
	])('%s: 404, nothing started', async (_label, headers) => {
		expectNotFound(await loadRoute().GET(get('', { headers })));
	});

	it('HEAD, should it reach GET: 404', async () => {
		expectNotFound(await loadRoute().GET(get('', { method: 'HEAD' })));
	});

	it.each(['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const)(
		'%s: 404 whatever the switch says, never a 405',
		async (method) => {
			for (const env of [{ ...EVER_ID_ENV, ...SWITCH_ON }, EVER_ID_ENV]) {
				const response = loadRoute(env)[method]();
				expect(response.status).toBe(404);
				expect(response.headers.get('allow')).toBeNull();
				expectRouteHeaders(response);
			}
			expect(mockSignIn).not.toHaveBeenCalled();
		}
	);
});

describe('GET /api/auth/ever-id/start: on, signed out, the sign-in the button starts', () => {
	it('starts the Ever ID sign-in landing on the workspace chooser, and sends the browser to the issuer', async () => {
		const response = await loadRoute().GET(get());

		expectRedirect(response, AUTHORIZATION_URL);
		expect(mockSignIn).toHaveBeenCalledTimes(1);
		expect(mockSignIn).toHaveBeenCalledWith('ever-id', { redirectTo: '/auth/workspace', redirect: false });
		expect(outcomeLines(info)).toEqual([expect.stringMatching(/^ever_id\.start outcome=started latency_ms=\d+/)]);
	});

	it('is the same sign-in as the "Login with Ever ID" button: same function, provider and landing', async () => {
		await loadRoute().GET(get());
		const fromLink = mockSignIn.mock.calls[0];

		mockSignIn.mockClear();
		type SocialLogins = typeof import('@/core/lib/helpers/social-logins');
		let signInFunction: SocialLogins['signInFunction'] | undefined;
		jest.isolateModules(() => {
			signInFunction = jest.requireActual<SocialLogins>('@/core/lib/helpers/social-logins').signInFunction;
		});
		await (signInFunction as NonNullable<typeof signInFunction>)({ id: 'ever-id' });
		const fromButton = mockSignIn.mock.calls[0];

		// The button lets next-auth redirect; the link asks for the address instead, to answer it with its headers.
		expect(fromLink[0]).toBe(fromButton[0]);
		expect(fromLink[1].redirectTo).toBe(fromButton[1].redirectTo);
	});

	it('keeps a return path of this site in its own cookie for the end of the sign-in, never in the sign-in', async () => {
		const response = await loadRoute().GET(get('?return=%2Fsettings%2Fteam%3Ftab%3Dmembers%23invite'));

		expectRedirect(response, AUTHORIZATION_URL);
		// The sign-in is the button's, unchanged.
		expect(mockSignIn).toHaveBeenCalledWith('ever-id', { redirectTo: '/auth/workspace', redirect: false });

		const cookie = returnCookie(response) ?? '';
		expect(cookie).toMatch(/^ever-id-start-return=%2Fsettings%2Fteam%3Ftab%3Dmembers%23invite;/);
		expect(cookie).toMatch(/; Max-Age=900(;|$)/i);
		expect(cookie).toMatch(/; Path=\/(;|$)/i);
		expect(cookie).toMatch(/; SameSite=lax(;|$)/i);
		expect(cookie).toMatch(/; Secure(;|$)/i);
		expect(cookie).not.toMatch(/HttpOnly/i);

		const { readEverIdStartReturnCookie } = jest.requireActual<typeof import('@/core/lib/auth/ever-id/start')>(
			'@/core/lib/auth/ever-id/start'
		);
		expect(readEverIdStartReturnCookie(cookie.split(';')[0])).toBe('/settings/team?tab=members#invite');
	});

	it('replaces a return path an earlier, abandoned link left with an empty one, when this one names none', async () => {
		const response = await loadRoute().GET(get('', { cookie: 'ever-id-start-return=%2Ftask%2F1' }));

		expectRedirect(response, AUTHORIZATION_URL);
		expect(returnCookie(response)).toMatch(/^ever-id-start-return=;.*Max-Age=900/i);
	});

	it.each([
		'?return=https://evil.example',
		'?return=//evil.example',
		'?return=/%5Cevil.example',
		'?return=/%09/evil.example',
		'?return=/task/1&return=/task/2'
	])('ignores a refused return path (%s): the person still signs in, landing on the chooser', async (search) => {
		const response = await loadRoute().GET(get(search));

		expectRedirect(response, AUTHORIZATION_URL);
		expect(mockSignIn).toHaveBeenCalledWith('ever-id', { redirectTo: '/auth/workspace', redirect: false });
		expect(returnCookie(response)).toMatch(/^ever-id-start-return=;.*Max-Age=900/i);
	});

	it('counts an expired access token, or one about to expire, as signed out', async () => {
		const route = loadRoute();

		for (const inSeconds of [-60, 30]) {
			mockSignIn.mockClear();
			expectRedirect(
				await route.GET(get('?return=/task/42', { cookie: `auth-token=${accessToken(inSeconds)}` })),
				AUTHORIZATION_URL
			);
			expect(mockSignIn).toHaveBeenCalledTimes(1);
		}
	});

	it('counts a refresh token alone, or a token that cannot be read, as signed out', async () => {
		const route = loadRoute();

		for (const cookie of ['auth-refresh-token=refresh', 'auth-token=not-a-token']) {
			mockSignIn.mockClear();
			expectRedirect(await route.GET(get('', { cookie })), AUTHORIZATION_URL);
			expect(mockSignIn).toHaveBeenCalledTimes(1);
		}
	});
});

describe('GET /api/auth/ever-id/start: on, signed in', () => {
	it('goes straight to the return path, without a new sign-in', async () => {
		const response = await loadRoute().GET(
			get('?return=/task/42?view=board', { cookie: `auth-token=${accessToken(3600)}` })
		);

		expectRedirect(response, '/task/42?view=board');
		expect(mockSignIn).not.toHaveBeenCalled();
		expect(returnCookie(response)).toBeUndefined();
		expect(outcomeLines(info)).toEqual([expect.stringMatching(/^ever_id\.start outcome=signed_in/)]);
	});

	it('goes to the home page without a return path, or with a refused one', async () => {
		const route = loadRoute();
		const cookie = `auth-token=${accessToken(3600)}`;

		expectRedirect(await route.GET(get('', { cookie })), '/');
		expectRedirect(await route.GET(get('?return=//evil.example', { cookie })), '/');
		expectRedirect(await route.GET(get('?return=https://evil.example/x', { cookie })), '/');
		expect(mockSignIn).not.toHaveBeenCalled();
	});

	it('reads a long access token from its chunks, as the sign-in page does', async () => {
		const token = accessToken(3600);
		const cookie = [
			'auth-token_totalChunks=2',
			`auth-token0=${token.slice(0, 20)}`,
			`auth-token1=${token.slice(20)}`
		].join('; ');

		expectRedirect(await loadRoute().GET(get('?return=/kanban', { cookie })), '/kanban');
		expect(mockSignIn).not.toHaveBeenCalled();
	});
});

describe('GET /api/auth/ever-id/start: the sign-in cannot start', () => {
	it('lands on the sign-in error page with a code only when next-auth throws', async () => {
		mockSignIn.mockRejectedValue(new Error(`issuer unreachable: ${AUTHORIZATION_URL}`));

		const response = await loadRoute().GET(get('?return=/task/42'));

		expectRedirect(response, '/auth/error?error=OAuthSignin');
		// Nothing started: no path is kept for a sign-in that will not end.
		expect(returnCookie(response)).toBeUndefined();
		expect(outcomeLines(warn)).toEqual([expect.stringMatching(/^ever_id\.start outcome=failed/)]);
		expect(error).toHaveBeenCalledWith('Ever ID sign-in could not start:', expect.stringMatching(/^Error: /));
	});

	it("keeps next-auth's own error page and code, and only them", async () => {
		const route = loadRoute();

		mockSignIn.mockResolvedValue(`${ORIGIN}/auth/error?error=Configuration`);
		expectRedirect(await route.GET(get()), '/auth/error?error=Configuration');

		mockSignIn.mockResolvedValue(`${ORIGIN}/auth/error?error=%3Cscript%3E&state=state-SECRET`);
		expectRedirect(await route.GET(get()), '/auth/error?error=OAuthSignin');

		mockSignIn.mockResolvedValue(`${ORIGIN}/auth/error`);
		expectRedirect(await route.GET(get()), '/auth/error?error=OAuthSignin');
	});

	it.each([
		['no address', undefined],
		['a relative address', '/api/auth/signin'],
		['another scheme', 'javascript:alert(1)'],
		['not an address', 'not a url']
	])('treats %s from next-auth as a sign-in that could not start', async (_label, answer) => {
		mockSignIn.mockResolvedValue(answer);

		expectRedirect(await loadRoute().GET(get()), '/auth/error?error=OAuthSignin');
	});
});
