/**
 * Test-only (never part of the app). Gauzy's session and timer routes as a `fetch`, with the rules a session lives by
 * on the real API (ever-gauzy `auth.service.ts` `rotateTokens`, `rotate-token-command.handler.ts`):
 * - an access token is refused with 401 once it has expired;
 * - `POST /auth/refresh-token` answers a new pair and rotates the refresh token;
 * - a refresh token used a second time is refused with 401 "Token is rotated", an expired one with 401 "jwt expired".
 *
 * The clock is `Date.now()`, which Jest's fake timers hold: a test moves it with `jest.setSystemTime`, and the tokens
 * age for the app and for this stand-in alike.
 */
export const HOUR_MS = 60 * 60 * 1000;

type RefreshTokenRecord = { status: 'active' | 'rotated' | 'revoked'; expiresAt: number };
type FakeRequest = { method: string; path: string; accessToken: string | null; status: number };

const encodePart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** A token shaped like Gauzy's. The app never checks its signature, so it is a placeholder. */
function signedToken(payload: Record<string, unknown>): string {
	return `${encodePart({ alg: 'HS256', typ: 'JWT' })}.${encodePart(payload)}.signature`;
}

export function createFakeGauzy({
	accessLifetimeMs = 24 * HOUR_MS,
	refreshLifetimeMs = 7 * 24 * HOUR_MS
}: { accessLifetimeMs?: number; refreshLifetimeMs?: number } = {}) {
	const accessTokens = new Map<string, number>();
	const refreshTokens = new Map<string, RefreshTokenRecord>();
	const requests: FakeRequest[] = [];
	let sequence = 0;
	let brokenRenewals: 'network' | 'server' | null = null;
	let brokenStop = false;
	let timer: { id: string; isRunning: boolean; duration: number; source: string } | null = null;

	const mintPair = () => {
		sequence += 1;
		const now = Date.now();
		const seconds = (ms: number) => Math.floor(ms / 1000);
		const token = signedToken({
			id: 'user-1',
			iat: seconds(now),
			exp: seconds(now + accessLifetimeMs),
			jti: `access-${sequence}`
		});
		const refresh_token = signedToken({
			id: 'user-1',
			iat: seconds(now),
			exp: seconds(now + refreshLifetimeMs),
			jti: `refresh-${sequence}`
		});
		accessTokens.set(token, now + accessLifetimeMs);
		refreshTokens.set(refresh_token, { status: 'active', expiresAt: now + refreshLifetimeMs });
		return { token, refresh_token };
	};

	const answer = (status: number, body: unknown) =>
		({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
	const refuse = (message: string) => answer(401, { statusCode: 401, message });

	const renew = (body: { refresh_token?: string }) => {
		if (brokenRenewals === 'network') throw new TypeError('Network request failed');
		if (brokenRenewals === 'server') return answer(503, { statusCode: 503, message: 'Service Unavailable' });
		const record = refreshTokens.get(String(body.refresh_token));
		if (!record) return refuse('Unauthorized');
		if (record.expiresAt <= Date.now()) return refuse('jwt expired');
		if (record.status !== 'active') return refuse(`Token is ${record.status}`);
		record.status = 'rotated';
		return answer(200, mintPair());
	};

	const route = (method: string, path: string, accessToken: string | null, body: Record<string, unknown>) => {
		if (method === 'POST' && path === '/auth/refresh-token') return renew(body);

		const expiresAt = accessToken ? accessTokens.get(accessToken) : undefined;
		if (!expiresAt || expiresAt <= Date.now()) return refuse('Unauthorized');

		if (method === 'GET' && path === '/user/me') {
			return answer(200, { id: 'user-1', email: 'ada@example.org', employee: { id: 'employee-1' } });
		}
		if (method === 'GET' && path === '/timesheet/timer/status') {
			return answer(200, { duration: timer?.duration ?? 0, running: !!timer?.isRunning, lastLog: timer });
		}
		if (method === 'POST' && path === '/timesheet/timer/stop') {
			if (brokenStop) return answer(500, { statusCode: 500, message: 'Internal server error' });
			if (!timer?.isRunning) return answer(406, { statusCode: 406, message: 'No running log found.' });
			timer = { ...timer, isRunning: false, duration: 1800 };
			return answer(200, timer);
		}
		return answer(404, { statusCode: 404, message: `Cannot ${method} ${path}` });
	};

	const fetch = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
		const method = String(init.method ?? 'GET').toUpperCase();
		// The app's API address comes first (`<origin>/api`), whatever the configuration of the test run gives it
		const address = String(input);
		const afterApi = address.indexOf('/api/');
		const path = (afterApi < 0 ? address : address.slice(afterApi + '/api'.length)).split('?')[0];
		const headers = (init.headers ?? {}) as Record<string, string>;
		const authorization = headers.authorization ?? headers.Authorization ?? '';
		const accessToken = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
		const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
		const request: FakeRequest = { method, path, accessToken, status: 0 };
		requests.push(request);
		const response = route(method, path, accessToken, body);
		request.status = response.status;
		return response;
	});

	return {
		/** What the app's `fetch` is replaced with. */
		fetch,
		/** A sign-in: the pair the app then holds. */
		signIn: mintPair,
		/** A timer the signed-in person started. */
		runTimer: () => {
			timer = { id: 'log-running', isRunning: true, duration: 0, source: 'MOBILE' };
			return timer;
		},
		timer: () => timer,
		/** The session is ended on the server: its refresh token is revoked, and no access token is accepted. */
		endSession: () => {
			refreshTokens.forEach((record) => {
				record.status = 'revoked';
			});
			accessTokens.clear();
		},
		/** The renewal alone cannot be made: its request fails on the network, or the API answers it 503. */
		breakRenewals: (failure: 'network' | 'server' | null) => {
			brokenRenewals = failure;
		},
		/** The API fails every stop with a 500, for a reason of its own. */
		breakStop: () => {
			brokenStop = true;
		},
		/** The requests the API received, optionally of one route. */
		sentTo: (method?: string, path?: string) =>
			requests.filter((request) => (!method || request.method === method) && (!path || request.path === path)),
		acceptsAccessToken: (token?: string | null) => (accessTokens.get(String(token)) ?? 0) > Date.now(),
		acceptsRefreshToken: (token?: string | null) => {
			const record = refreshTokens.get(String(token));
			return !!record && record.status === 'active' && record.expiresAt > Date.now();
		}
	};
}

export type FakeGauzy = ReturnType<typeof createFakeGauzy>;
