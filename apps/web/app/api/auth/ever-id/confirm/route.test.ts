/**
 * POST /api/auth/ever-id/confirm: Gauzy's one-time e-mail code completes the link of an Ever ID sign-in.
 * Runs against a stand-in of the Gauzy API that answers like its Ever ID routes.
 */
import { MockGauzyApi, everIdWorkspace, workspacesAnswer } from '@/test/ever-id/mock-gauzy-api';

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

function post(body: unknown) {
	return new Request('https://teams.example.test/api/auth/ever-id/confirm', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

describe('POST /api/auth/ever-id/confirm', () => {
	it('answers 404 and calls nothing while Ever ID is not configured', async () => {
		const { POST } = loadRoute(false);

		const res = await POST(post({ handoff: HANDOFF, code: 'ABC123' }));

		expect(res.status).toBe(404);
		expect(gauzy.requests).toEqual([]);
	});

	it('passes the key and the code to the API and answers its workspace list, uncached', async () => {
		const { POST } = loadRoute(true);
		const answer = workspacesAnswer([everIdWorkspace('user-1', 'tenant-1', 'Acme')]);
		gauzy.on('POST', CONFIRM_PATH, { status: 200, body: answer });

		const res = await POST(post({ handoff: HANDOFF, code: ' ABC123 ' }));

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		await expect(res.json()).resolves.toEqual(answer);
		expect(gauzy.calls('POST', CONFIRM_PATH).map((call) => call.body)).toEqual([
			{ handoff: HANDOFF, code: 'ABC123' }
		]);
		expect(logs.join('\n')).toContain('ever_id.confirm outcome=ok');
	});

	it.each([
		['a wrong code (401)', 401, 400, 'invalid_code'],
		['a used-up or expired key (410)', 410, 410, 'expired'],
		["the API's rate limit (429)", 429, 429, 'throttled'],
		['the routes switched off (404)', 404, 502, 'unavailable'],
		['an API failure (500)', 500, 502, 'unavailable']
	])('maps %s', async (_label, apiStatus, status, reason) => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', CONFIRM_PATH, { status: apiStatus, body: { statusCode: apiStatus } });

		const res = await POST(post({ handoff: HANDOFF, code: 'ABC123' }));

		expect(res.status).toBe(status);
		expect((await res.json()).reason).toBe(reason);
		// A wrong code is a 400, never a 401: the app's own client treats 401 as "signed out".
		expect(res.status).not.toBe(401);
	});

	it.each([
		['no key', { code: 'ABC123' }],
		['a malformed key', { handoff: 'person@example.test', code: 'ABC123' }],
		['no code', { handoff: HANDOFF }],
		['an overlong code', { handoff: HANDOFF, code: 'x'.repeat(65) }]
	])('answers 400 without calling the API for %s', async (_label, body) => {
		const { POST } = loadRoute(true);

		const res = await POST(post(body));

		expect(res.status).toBe(400);
		expect(gauzy.requests).toEqual([]);
	});

	it('never logs the key or the code', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', CONFIRM_PATH, { status: 401, body: {} });

		await POST(post({ handoff: HANDOFF, code: 'SECRET1' }));

		expect(logs.join('\n')).not.toMatch(new RegExp(`${HANDOFF}|SECRET1`));
	});
});
