/**
 * Test-only (never part of the app). Gauzy's session and timer routes as a `fetch`, with the rules a session lives by
 * on the real API (ever-gauzy `auth.service.ts` `rotateTokens`, `rotate-token-command.handler.ts`):
 * - an access token is refused with 401 once it has expired;
 * - `POST /auth/refresh-token` answers a new pair and rotates the refresh token;
 * - a refresh token used a second time is refused with 401 "Token is rotated", an expired one with 401 "jwt expired".
 *
 * The clock is `Date.now()`, which Jest's fake timers hold: a test moves it with `jest.setSystemTime`, and the tokens
 * age for the app and for this stand-in alike.
 *
 * The timer's start can be moved (`PUT /timesheet/timer/started-at`, ever-co/ever-gauzy#11941) and a run discarded
 * (`POST /timesheet/timer/discard`, ever-co/ever-gauzy#11935), by the rules the API applies to them.
 */
export const HOUR_MS = 60 * 60 * 1000;
export const ORGANIZATION_ID = 'organization-1';

/** An organization that lets members change, add and discard tracked time, as the API answers it. */
const OPEN_ORGANIZATION = {
	allowModifyTime: true,
	allowManualTime: true,
	requireReason: false,
	allowDiscardTimer: true,
	discardTimerWithinMinutes: null
};
/** A role that runs the timer and may change and add tracked time. */
const EDITOR_PERMISSIONS = ['TIME_TRACKER', 'ALLOW_MODIFY_TIME', 'ALLOW_MANUAL_TIME'];

type FakeTimer = {
	id: string;
	isRunning: boolean;
	duration: number;
	source: string;
	startedAt: string;
	isEdited: boolean;
};
type FakeEntry = { startedAt: string; stoppedAt: string; duration: number };

type RefreshTokenRecord = { status: 'active' | 'rotated' | 'revoked'; expiresAt: number };
type FakeRequest = { method: string; path: string; accessToken: string | null; status: number };
/** How a request the API does not answer fails: on the network, or with a 5xx for a reason of the API's own. */
type Failure = 'network' | 'server';

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
	let brokenRenewals: Failure | null = null;
	let brokenStop: Failure | null = null;
	let timer: FakeTimer | null = null;
	/** The entries of the day that no longer run: they count in the day's total. */
	const entries: FakeEntry[] = [];
	let organization: Record<string, unknown> = { ...OPEN_ORGANIZATION };
	let permissions: string[] = [...EDITOR_PERMISSIONS];
	/** An API from before the move of a running start: its route answers 404. */
	let withoutStartMove = false;

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
	const refusal = (status: number, code: string) => answer(status, { statusCode: status, message: code, code });

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

	const stop = () => {
		if (brokenStop === 'network') throw new TypeError('Network request failed');
		if (brokenStop === 'server') return answer(500, { statusCode: 500, message: 'Internal server error' });
		if (!timer?.isRunning) return answer(406, { statusCode: 406, message: 'No running log found.' });
		timer = { ...timer, isRunning: false, duration: 1800 };
		return answer(200, timer);
	};

	/** `PUT /timesheet/timer/started-at`: the new start of the running timer, earlier or later. */
	const moveStart = (body: Record<string, unknown>) => {
		if (withoutStartMove)
			return answer(404, { statusCode: 404, message: 'Cannot PUT /timesheet/timer/started-at' });
		if (typeof body.startedAt !== 'string') {
			return answer(400, { statusCode: 400, message: ['startedAt must be a Date instance'] });
		}
		if (!timer?.isRunning) return refusal(400, 'TIMER_NOT_RUNNING');
		const start = Date.parse(body.startedAt);
		if (start > Date.now()) return refusal(400, 'TIMER_START_IN_FUTURE');
		const current = Date.parse(timer.startedAt);
		const isCovered = (entry: FakeEntry) =>
			Date.parse(entry.stoppedAt) > start && Date.parse(entry.startedAt) < current;
		const overlaps = start < current && entries.some(isCovered);
		if (overlaps) return refusal(409, 'TIMER_START_OVERLAP');
		timer = { ...timer, startedAt: new Date(start).toISOString(), isEdited: true };
		return answer(200, timer);
	};

	/** `POST /timesheet/timer/discard`: the running run is removed, as if it never started. */
	const discard = (body: Record<string, unknown>) => {
		if (!timer?.isRunning) return answer(400, { statusCode: 400, message: 'No timer is running.' });
		const namesAnotherRun = !!body.timeLogId && body.timeLogId !== timer.id;
		if (namesAnotherRun) return answer(409, { statusCode: 409, message: 'Another run is running.' });
		if (timer.source === 'DESKTOP') return refusal(409, 'TIMER_DISCARD_TRACKER_RUN');
		if (organization.allowDiscardTimer === false) return refusal(403, 'TIMER_DISCARD_DISABLED');
		const limit = organization.discardTimerWithinMinutes;
		const hasLimit = typeof limit === 'number' && limit > 0;
		const isTooLate = hasLimit && Date.now() - Date.parse(timer.startedAt) >= limit * 60 * 1000;
		if (isTooLate) return refusal(403, 'TIMER_DISCARD_TOO_LATE');
		timer = null;
		return answer(204, undefined);
	};

	const route = (method: string, path: string, accessToken: string | null, body: Record<string, unknown>) => {
		if (method === 'POST' && path === '/auth/refresh-token') return renew(body);

		const expiresAt = accessToken ? accessTokens.get(accessToken) : undefined;
		if (!expiresAt || expiresAt <= Date.now()) return refuse('Unauthorized');

		if (method === 'GET' && path === '/user/me') {
			return answer(200, { id: 'user-1', email: 'ada@example.org', employee: { id: 'employee-1' } });
		}
		if (method === 'GET' && path === '/timesheet/timer/status') {
			const finished = entries.reduce((total, entry) => total + entry.duration, 0);
			return answer(200, {
				duration: finished + (timer?.duration ?? 0),
				running: !!timer?.isRunning,
				lastLog: timer
			});
		}
		if (method === 'POST' && path === '/timesheet/timer/stop') return stop();
		if (method === 'PUT' && path === '/timesheet/timer/started-at') return moveStart(body);
		if (method === 'POST' && path === '/timesheet/timer/discard') return discard(body);
		if (method === 'GET' && path === `/organization/${ORGANIZATION_ID}`) {
			return answer(200, { id: ORGANIZATION_ID, ...organization });
		}
		if (method === 'GET' && path === '/role-permissions/me') {
			const rows = permissions.map((permission) => ({
				id: permission,
				roleId: 'role-1',
				permission,
				enabled: true
			}));
			return answer(200, rows);
		}
		return answer(404, { statusCode: 404, message: `Cannot ${method} ${path}` });
	};

	/** The address a request is sent to, in whichever form `fetch` is given it. */
	const addressOf = (input: RequestInfo | URL) => {
		if (typeof input === 'string') return input;
		return input instanceof URL ? input.href : input.url;
	};

	const send = (input: RequestInfo | URL, init: RequestInit) => {
		const method = String(init.method ?? 'GET').toUpperCase();
		// The app's API address comes first (`<origin>/api`), whatever the configuration of the test run gives it
		const address = addressOf(input);
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
	};

	// Answered later, as `fetch` does: a route that fails on the network throws, and the promise then rejects
	const fetch = jest.fn((input: RequestInfo | URL, init: RequestInit = {}) =>
		Promise.resolve().then(() => send(input, init))
	);

	return {
		/** What the app's `fetch` is replaced with. */
		fetch,
		/** A sign-in: the pair the app then holds. */
		signIn: mintPair,
		/** A timer the signed-in person started. */
		runTimer: ({ source = 'MOBILE', startedAt }: { source?: string; startedAt?: string } = {}) => {
			const start = startedAt ?? new Date().toISOString();
			timer = { id: 'log-running', isRunning: true, duration: 0, source, startedAt: start, isEdited: false };
			return timer;
		},
		/** An entry of the day that no longer runs. */
		addEntry: (startedAt: string, stoppedAt: string) => {
			const duration = Math.round((Date.parse(stoppedAt) - Date.parse(startedAt)) / 1000);
			entries.push({ startedAt, stoppedAt, duration });
		},
		/** The organization's settings as the API answers them; `replace` drops the ones it had. */
		setOrganization: (settings: Record<string, unknown>, { replace = false }: { replace?: boolean } = {}) => {
			organization = replace ? { ...settings } : { ...organization, ...settings };
		},
		/** The permissions of the signed-in person's role. */
		setPermissions: (held: string[]) => {
			permissions = [...held];
		},
		/** The API is one from before the move of a running start. */
		withoutStartMove: () => {
			withoutStartMove = true;
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
		breakRenewals: (failure: Failure | null) => {
			brokenRenewals = failure;
		},
		/** Every stop fails: the API answers 500 for a reason of its own, or the request never reaches it. */
		breakStop: (failure: Failure = 'server') => {
			brokenStop = failure;
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
