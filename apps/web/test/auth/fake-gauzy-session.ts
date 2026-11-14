/**
 * Test-only (never part of the app). Gauzy's session and timer routes as an Axios adapter, with the rules a session
 * lives by on the real API (ever-gauzy `auth.service.ts` `rotateTokens`, `rotate-token-command.handler.ts`):
 * - an access token is refused with 401 once it has expired;
 * - `POST /auth/refresh-token` answers a new pair and rotates the refresh token;
 * - a refresh token used a second time is refused with 401 "Token is rotated", an expired one with 401 "jwt expired".
 *
 * It answers the routes of both API modes: Gauzy's own (direct mode) and the web app's `/api` routes in front of
 * them (proxy mode), which answer a timer command with the day's status.
 *
 * The clock is `Date.now()`, so a test that moves it (`jest.setSystemTime`, a `Date.now` spy) ages the tokens for the
 * app and for this stand-in alike.
 */
import { AxiosAdapter, AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const HOUR_MS = 60 * 60 * 1000;

/** The person the stand-in signs in. Gauzy's ids are UUIDs, which the app's schemas require. */
export const FAKE_USER = {
	id: '11111111-1111-4111-8111-111111111111',
	employeeId: '22222222-2222-4222-8222-222222222222',
	tenantId: '33333333-3333-4333-8333-333333333333',
	organizationId: '44444444-4444-4444-8444-444444444444'
};

interface FakeGauzyOptions {
	/** Access token lifetime. Gauzy's default is one day. */
	accessLifetimeMs?: number;
	/** Refresh token lifetime. Gauzy's code default is seven days; its sample configuration sets one day. */
	refreshLifetimeMs?: number;
}

interface FakeGauzyRequest {
	method: string;
	path: string;
	accessToken: string | null;
	body: Record<string, unknown>;
}

interface FakeTimeLog {
	id: string;
	source: string;
	isRunning: boolean;
	startedAt: string;
	stoppedAt: string;
}

type RefreshTokenRecord = { status: 'active' | 'rotated' | 'revoked'; expiresAt: number; organizationId: string };

const encodePart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** A token `jwt-decode` reads. Its signature is never checked by the app, so it is a placeholder. */
function signedToken(payload: Record<string, unknown>): string {
	return `${encodePart({ alg: 'HS256', typ: 'JWT' })}.${encodePart(payload)}.signature`;
}

const seconds = (milliseconds: number) => Math.floor(milliseconds / 1000);

function pathOf(url: string | undefined): string {
	return (url ?? '').split('?')[0];
}

function bearerOf(config: InternalAxiosRequestConfig): string | null {
	const header = AxiosHeaders.from(config.headers).get('Authorization');
	return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

function bodyOf(config: InternalAxiosRequestConfig): Record<string, unknown> {
	if (typeof config.data === 'string') {
		try {
			return JSON.parse(config.data) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	return (config.data as Record<string, unknown> | undefined) ?? {};
}

export function createFakeGauzy(options: FakeGauzyOptions = {}) {
	const accessLifetimeMs = options.accessLifetimeMs ?? 24 * HOUR_MS;
	const refreshLifetimeMs = options.refreshLifetimeMs ?? 7 * 24 * HOUR_MS;
	const accessTokens = new Map<string, number>();
	const refreshTokens = new Map<string, RefreshTokenRecord>();
	const requests: FakeGauzyRequest[] = [];
	const refusedRoutes = new Set<string>();
	let sequence = 0;
	let isOnline = true;
	let isHolding = false;
	let held: Array<() => void> = [];
	let timeLog: FakeTimeLog | null = null;
	let brokenRenewals: 'network' | 'server' | null = null;

	const mintPair = (organizationId = FAKE_USER.organizationId) => {
		sequence += 1;
		const now = Date.now();
		const identity = { id: FAKE_USER.id, tenantId: FAKE_USER.tenantId, organizationId };
		const token = signedToken({
			...identity,
			employeeId: FAKE_USER.employeeId,
			role: 'EMPLOYEE',
			iat: seconds(now),
			exp: seconds(now + accessLifetimeMs),
			jti: `access-${sequence}`
		});
		const refresh_token = signedToken({
			...identity,
			email: 'ada@example.org',
			iat: seconds(now),
			exp: seconds(now + refreshLifetimeMs),
			jti: `refresh-${sequence}`
		});
		accessTokens.set(token, now + accessLifetimeMs);
		refreshTokens.set(refresh_token, { status: 'active', expiresAt: now + refreshLifetimeMs, organizationId });
		return { token, refresh_token };
	};

	const answer = (config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse => {
		const response = { config, data, headers: {}, status, statusText: String(status) } as AxiosResponse;
		if (status >= 400) {
			const code = status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
			throw new AxiosError(`Request failed with status code ${status}`, code, config, null, response);
		}
		return response;
	};

	const refuse = (config: InternalAxiosRequestConfig, message: string) =>
		answer(config, 401, { statusCode: 401, message });

	const user = () => ({
		id: FAKE_USER.id,
		email: 'ada@example.org',
		tenantId: FAKE_USER.tenantId,
		isEmailVerified: true,
		employee: {
			id: FAKE_USER.employeeId,
			userId: FAKE_USER.id,
			organizationId: FAKE_USER.organizationId,
			tenantId: FAKE_USER.tenantId,
			isTrackingTime: !!timeLog?.isRunning
		}
	});

	/** The rotation, for Gauzy's own route and for the web app's route in front of it. */
	const answerRefresh = (
		config: InternalAxiosRequestConfig,
		body: Record<string, unknown>,
		isProxyRoute: boolean
	) => {
		if (brokenRenewals === 'network') {
			throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
		}
		if (brokenRenewals === 'server') {
			return answer(config, 503, { statusCode: 503, message: 'Service Unavailable' });
		}
		const record = refreshTokens.get(String(body.refresh_token));
		if (!record) return refuse(config, 'Unauthorized');
		if (record.expiresAt <= Date.now()) return refuse(config, 'jwt expired');
		if (record.status !== 'active') return refuse(config, `Token is ${record.status}`);
		record.status = 'rotated';
		const pair = mintPair(record.organizationId);
		return answer(config, 200, isProxyRoute ? { user: user(), ...pair } : pair);
	};

	const timerStatus = () => ({ duration: 0, running: !!timeLog?.isRunning, lastLog: timeLog });

	const stop = (config: InternalAxiosRequestConfig, body: Record<string, unknown>) => {
		if (!timeLog?.isRunning) {
			return answer(config, 406, { statusCode: 406, message: 'No running log found.' });
		}
		if (body.timeLogId && body.timeLogId !== timeLog.id) {
			return answer(config, 409, {
				statusCode: 409,
				message: 'This stop names a time log that is not the running one.'
			});
		}
		const stoppedAt = typeof body.stoppedAt === 'string' ? body.stoppedAt : new Date(Date.now()).toISOString();
		timeLog = { ...timeLog, isRunning: false, stoppedAt };
		return null;
	};

	const heartbeat = () => {
		// It moves the running log's end to the server's time
		if (timeLog?.isRunning) timeLog = { ...timeLog, stoppedAt: new Date(Date.now()).toISOString() };
	};

	const answerRoute = (config: InternalAxiosRequestConfig, request: FakeGauzyRequest): AxiosResponse => {
		const { method, path, body } = request;
		const route = `${method} ${path}`;
		if (route === 'POST /auth/refresh-token') return answerRefresh(config, body, false);
		if (route === 'POST /auth/refresh') return answerRefresh(config, body, true);

		const expiresAt = request.accessToken ? accessTokens.get(request.accessToken) : undefined;
		if (!expiresAt || expiresAt <= Date.now() || refusedRoutes.has(route)) return refuse(config, 'Unauthorized');

		switch (route) {
			case 'GET /user/me':
				return answer(config, 200, user());
			// Gauzy's routes
			case 'GET /timesheet/timer/status':
				return answer(config, 200, timerStatus());
			case 'GET /timesheet/timer/status/worked':
				return answer(config, 200, [timerStatus()]);
			case 'POST /timesheet/timer/stop':
				return stop(config, body) ?? answer(config, 200, timeLog);
			case 'POST /timesheet/time-slot':
				heartbeat();
				return answer(config, 200, {});
			// The web app's routes, which answer the day's status
			case 'GET /timer/status':
				return answer(config, 200, timerStatus());
			case 'POST /timer/stop':
				return stop(config, body) ?? answer(config, 200, timerStatus());
			case 'POST /timer/sync':
				heartbeat();
				return answer(config, 200, timerStatus());
			default:
				return answer(config, 200, {});
		}
	};

	const adapter: AxiosAdapter = async (config) => {
		const request: FakeGauzyRequest = {
			method: (config.method ?? 'get').toUpperCase(),
			path: pathOf(config.url),
			accessToken: bearerOf(config),
			body: bodyOf(config)
		};
		requests.push(request);
		if (isHolding) {
			await new Promise<void>((resolve) => held.push(resolve));
		}
		if (!isOnline) {
			throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
		}
		return answerRoute(config, request);
	};

	const answerWaiting = () => {
		const waiting = held;
		held = [];
		waiting.forEach((release) => release());
	};

	return {
		adapter,
		requests,
		/** A sign-in: the pair the app keeps in its cookies. Another organization gives a token of another scope. */
		signIn: (scope: { organizationId?: string } = {}) => mintPair(scope.organizationId),
		/** How many requests reached `METHOD /path`, refused ones included. */
		count: (method: string, path: string) =>
			requests.filter((request) => request.method === method && request.path === path).length,
		/** The requests sent to `METHOD /path`, in order. */
		sentTo: (method: string, path: string) =>
			requests.filter((request) => request.method === method && request.path === path),
		/** Requests are received and wait: several can then be in flight together. */
		holdAnswers: () => {
			isHolding = true;
		},
		/** The requests that wait now are answered, in the order they came. The next ones wait in turn. */
		answerHeld: answerWaiting,
		/** The requests that wait are answered, and the next ones are answered as they come. */
		answerAll: () => {
			isHolding = false;
			answerWaiting();
		},
		/** How many requests wait for their answer. */
		heldCount: () => held.length,
		/**
		 * Another tab of the same browser renews the session with the refresh token both tabs share: the server
		 * rotates it and answers the pair that tab then writes to the cookies.
		 */
		renewFromAnotherTab: (refreshToken: string) => {
			const record = refreshTokens.get(refreshToken);
			if (record?.status !== 'active' || record.expiresAt <= Date.now()) {
				throw new Error('The other tab could not renew the session with this refresh token');
			}
			record.status = 'rotated';
			return mintPair(record.organizationId);
		},
		/** Nothing reaches the API: every request fails with a network error. */
		goOffline: () => {
			isOnline = false;
		},
		goOnline: () => {
			isOnline = true;
		},
		/** The renewal alone cannot be made: its request fails on the network, or the API answers it 503. */
		breakRenewals: (failure: 'network' | 'server' | null) => {
			brokenRenewals = failure;
		},
		/** A route that answers 401 for a reason of its own, whatever the token. */
		refuseRoute: (method: string, path: string) => {
			refusedRoutes.add(`${method} ${path}`);
		},
		/** The session is ended on the server: every refresh token is revoked and every access token refused. */
		endSession: () => {
			refreshTokens.forEach((record) => {
				record.status = 'revoked';
			});
			accessTokens.clear();
		},
		/** A timer the person started earlier, still running. */
		runTimer: (startedMsAgo = 30 * 60 * 1000): FakeTimeLog => {
			const startedAt = new Date(Date.now() - startedMsAgo).toISOString();
			timeLog = { id: 'log-running', source: 'TEAMS', isRunning: true, startedAt, stoppedAt: startedAt };
			return timeLog;
		},
		timeLog: () => timeLog,
		/** Whether the refresh token is the one the server would accept now. */
		acceptsRefreshToken: (refreshToken: string | null | undefined) => {
			const record = refreshToken ? refreshTokens.get(refreshToken) : undefined;
			return !!record && record.status === 'active' && record.expiresAt > Date.now();
		},
		/** Whether the access token is one the server would accept now. */
		acceptsAccessToken: (accessToken: string | null | undefined) => {
			const expiresAt = accessToken ? accessTokens.get(accessToken) : undefined;
			return !!expiresAt && expiresAt > Date.now();
		}
	};
}

export type FakeGauzy = ReturnType<typeof createFakeGauzy>;
