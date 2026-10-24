/**
 * POST /api/auth/ever-id/confirm: Gauzy's one-time e-mail code completes the link of an Ever ID sign-in. The
 * one-time key comes from the sealed cookie the sign-in set, never from the page.
 * Runs against a stand-in of the Gauzy API that answers like its Ever ID routes.
 */
import {
	MockGauzyApi,
	busyAnswer,
	everIdWorkspace,
	throttledAnswer,
	workspacesAnswer
} from '@/test/ever-id/mock-gauzy-api';

const CONFIRM_PATH = '/api/auth/zitadel/confirm';
const HANDOFF = 'k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA';
const EVER_ID_ENV = [
	'NEXT_PUBLIC_EVER_ID_APP_NAME',
	'EVER_ID_ISSUER_URL',
	'EVER_ID_CLIENT_ID',
	'EVER_ID_CLIENT_SECRET'
];
const ORIGINAL_ENV = { ...process.env };

type RouteModule = typeof import('./route');

let gauzy: MockGauzyApi;
let logs: string[];

beforeAll(async () => {
	gauzy = await new MockGauzyApi().start();
	process.env.AUTH_SECRET = 'test-only-auth-secret';
});

afterAll(async () => {
	await gauzy.stop();
	process.env = ORIGINAL_ENV;
});

beforeEach(() => {
	gauzy.reset();
	logs = [];
	for (const method of ['info', 'warn', 'error', 'log'] as const) {
		jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
			logs.push(args.map(String).join(' '));
		});
	}
});

afterEach(() => {
	jest.restoreAllMocks();
});

function loadRoute(configured: boolean): RouteModule {
	for (const key of EVER_ID_ENV) delete process.env[key];
	process.env.GAUZY_API_SERVER_URL = gauzy.origin;
	if (configured) {
		process.env.NEXT_PUBLIC_EVER_ID_APP_NAME = 'Ever ID';
		process.env.EVER_ID_ISSUER_URL = 'https://id.example.test';
		process.env.EVER_ID_CLIENT_ID = 'teams-web-client';
		process.env.EVER_ID_CLIENT_SECRET = 'teams-web-secret';
	}
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		mod = require('./route');
	});
	return mod as RouteModule;
}

/** The Cookie header the sign-in leaves for a step, sealed by this server. */
function stepCookie(step: 'confirm' | 'signup' = 'confirm', key = HANDOFF): string {
	let value = '';
	jest.isolateModules(() => {
		value = require('@/core/lib/auth/ever-id/handoff').sealEverIdHandoff(key, step);
	});
	return `ever-id-handoff=${value}`;
}

function post(body: unknown, options: { cookie?: string | null; contentType?: string } = {}) {
	const cookie = options.cookie === undefined ? stepCookie() : options.cookie;
	return new Request('https://teams.example.test/api/auth/ever-id/confirm', {
		method: 'POST',
		headers: {
			'content-type': options.contentType ?? 'application/json',
			...(cookie ? { cookie } : {})
		},
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

/** Whether a response drops the step cookie. */
function clearsStepCookie(res: Response): boolean {
	return /ever-id-handoff=;.*Max-Age=0/i.test(res.headers.get('set-cookie') ?? '');
}

describe('POST /api/auth/ever-id/confirm', () => {
	it('answers 404 and calls nothing while Ever ID is not configured', async () => {
		const { POST } = loadRoute(false);

		const res = await POST(post({ code: 'ABC123' }));

		expect(res.status).toBe(404);
		expect(gauzy.requests).toEqual([]);
	});

	it("passes the cookie's key and the code to the API, answers its workspace list uncached and drops the cookie", async () => {
		const { POST } = loadRoute(true);
		const answer = workspacesAnswer([everIdWorkspace('user-1', 'tenant-1', 'Acme')]);
		gauzy.on('POST', CONFIRM_PATH, { status: 200, body: answer });

		const res = await POST(post({ code: ' ABC123 ' }));

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		// Only what the passcode page uses.
		await expect(res.json()).resolves.toEqual({
			workspaces: answer.workspaces,
			confirmed_email: answer.confirmed_email,
			total_workspaces: answer.total_workspaces
		});
		expect(gauzy.calls('POST', CONFIRM_PATH).map((call) => call.body)).toEqual([
			{ handoff: HANDOFF, code: 'ABC123' }
		]);
		expect(clearsStepCookie(res)).toBe(true);
		expect(logs.join('\n')).toContain('ever_id.confirm outcome=ok');
	});

	it('passes on the team lists of the workspaces', async () => {
		const { POST } = loadRoute(true);
		const teams = [
			{
				team_id: 'team-1',
				team_name: 'Team',
				team_logo: '',
				team_member_count: '1',
				profile_link: '',
				prefix: null
			}
		];
		const answer = workspacesAnswer([{ ...everIdWorkspace('user-1', 'tenant-1', 'Acme'), current_teams: teams }]);
		gauzy.on('POST', CONFIRM_PATH, { status: 200, body: answer });

		const body = await (await POST(post({ code: 'ABC123' }))).json();

		expect(body.workspaces[0].current_teams).toEqual(teams);
	});

	it.each([
		['a wrong code (401)', 401, 400, 'invalid_code', false],
		// A 410 now always means used up or expired.
		['a used-up or expired key (410)', 410, 410, 'expired', true],
		['the routes switched off (404)', 404, 502, 'unavailable', false],
		['an API failure (500)', 500, 502, 'unavailable', false]
	])('maps %s', async (_label, apiStatus, status, reason, dropsCookie) => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', CONFIRM_PATH, { status: apiStatus, body: { statusCode: apiStatus } });

		const res = await POST(post({ code: 'ABC123' }));

		expect(res.status).toBe(status);
		expect((await res.json()).reason).toBe(reason);
		expect(clearsStepCookie(res)).toBe(dropsCookie);
		// A wrong code is a 400, never a 401: the app's own client treats 401 as "signed out".
		expect(res.status).not.toBe(401);
	});

	it('tries again while another attempt holds the key, then answers what the API says', async () => {
		const { POST } = loadRoute(true);
		let calls = 0;
		const answer = workspacesAnswer([everIdWorkspace('user-1', 'tenant-1', 'Acme')]);
		gauzy.on('POST', CONFIRM_PATH, () => (++calls === 1 ? busyAnswer(1) : { status: 200, body: answer }));

		const res = await POST(post({ code: 'ABC123' }));

		expect(res.status).toBe(200);
		expect(gauzy.calls('POST', CONFIRM_PATH)).toHaveLength(2);
	}, 15_000);

	it.each([
		['still busy after the retries (409 handoff_busy)', busyAnswer(1), 1, 3],
		["the API's limit for this key (429 handoff_throttled)", throttledAnswer(30), 30, 1]
	])(
		'answers 429 with a Retry-After and keeps the cookie when %s',
		async (_label, answer, retryAfter, calls) => {
			const { POST } = loadRoute(true);
			gauzy.on('POST', CONFIRM_PATH, answer);

			const res = await POST(post({ code: 'ABC123' }));

			expect(res.status).toBe(429);
			expect(res.headers.get('retry-after')).toBe(String(retryAfter));
			expect(clearsStepCookie(res)).toBe(false);
			expect(gauzy.calls('POST', CONFIRM_PATH)).toHaveLength(calls);
		},
		15_000
	);

	it.each([
		['an empty workspace list', { ...workspacesAnswer([]) }],
		[
			'no verified address',
			{ ...workspacesAnswer([everIdWorkspace('user-1', 'tenant-1', 'Acme')]), confirmed_email: '' }
		],
		[
			'workspaces without a token',
			workspacesAnswer([{ ...everIdWorkspace('user-1', 'tenant-1', 'Acme'), token: '' }])
		],
		['no workspace list', { confirmed_email: 'person@example.test' }]
	])('refuses an incomplete answer of the API (%s) instead of passing it on', async (_label, body) => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', CONFIRM_PATH, { status: 200, body });

		const res = await POST(post({ code: 'ABC123' }));

		expect(res.status).toBe(502);
		expect((await res.json()).reason).toBe('unavailable');
		expect(logs.join('\n')).toContain('ever_id.confirm outcome=gauzy_error');
	});

	it.each([
		['no cookie', null],
		[
			'a cookie this server did not seal',
			`ever-id-handoff=${require('node:crypto').randomBytes(64).toString('base64url')}`
		],
		['the plain key as the cookie', `ever-id-handoff=${HANDOFF}`],
		['the cookie of the sign-up step', stepCookie('signup')]
	])('answers 410 without calling the API for %s', async (_label, cookie) => {
		const { POST } = loadRoute(true);

		const res = await POST(post({ code: 'ABC123' }, { cookie }));

		expect(res.status).toBe(410);
		expect(gauzy.requests).toEqual([]);
	});

	it.each([
		['no code', { body: {} }],
		['an overlong code', { body: { code: 'x'.repeat(65) } }],
		['a plain form post', { body: 'code=ABC123', contentType: 'application/x-www-form-urlencoded' }],
		['a text body', { body: '{"code":"ABC123"}', contentType: 'text/plain' }],
		['an oversized body', { body: { code: 'ABC123', padding: 'x'.repeat(2_000) } }]
	])('answers 400 without calling the API for %s', async (_label, request) => {
		const { POST } = loadRoute(true);

		const res = await POST(post(request.body, { contentType: (request as { contentType?: string }).contentType }));

		expect(res.status).toBe(400);
		expect(gauzy.requests).toEqual([]);
	});

	describe('the attempts of one key', () => {
		let clock = 0;
		beforeEach(() => {
			clock = Date.now();
			jest.spyOn(Date, 'now').mockImplementation(() => clock);
		});

		it('are four a minute here, below the API limit; then 429 with when to try again, the cookie kept', async () => {
			const { POST } = loadRoute(true);
			gauzy.on('POST', CONFIRM_PATH, { status: 401, body: {} });

			const statuses: number[] = [];
			for (let attempt = 0; attempt < 4; attempt++) statuses.push((await POST(post({ code: 'WRONG1' }))).status);
			clock += 15_000;
			const limited = await POST(post({ code: 'WRONG1' }));

			expect(statuses).toEqual([400, 400, 400, 400]);
			expect(limited.status).toBe(429);
			expect(limited.headers.get('retry-after')).toBe('45');
			expect(clearsStepCookie(limited)).toBe(false);
			expect(gauzy.calls('POST', CONFIRM_PATH)).toHaveLength(4);
			// Another key is not affected, and the key gets its tries again a minute later.
			const other = await POST(post({ code: 'WRONG1' }, { cookie: stepCookie('confirm', `${'Q'.repeat(42)}A`) }));
			expect(other.status).toBe(400);
			clock += 45_000;
			expect((await POST(post({ code: 'WRONG1' }))).status).toBe(400);
		});

		it('do not count a try the API did not judge (unreachable, rate limit, failure)', async () => {
			const { POST } = loadRoute(true);
			gauzy.on('POST', CONFIRM_PATH, { status: 503, body: {} });

			const statuses: number[] = [];
			for (let attempt = 0; attempt < 7; attempt++) statuses.push((await POST(post({ code: 'ABC123' }))).status);

			expect(statuses).toEqual(Array(7).fill(502));
			expect(gauzy.calls('POST', CONFIRM_PATH)).toHaveLength(7);
		});
	});

	it('never logs the key or the code', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', CONFIRM_PATH, { status: 401, body: {} });

		await POST(post({ code: 'SECRET1' }));

		expect(logs.join('\n')).not.toMatch(new RegExp(`${HANDOFF}|SECRET1`));
	});
});
