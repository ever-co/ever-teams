/**
 * POST /api/auth/ever-id/backchannel-logout, end to end over HTTP: a local OpenID Provider signs the logout
 * tokens and publishes its keys, and a stand-in of the Gauzy API receives the forwarded ones.
 */
// jose ships as an ES module only and jest runs CommonJS: Node itself loads it (require of an ES module).
jest.mock('jose', () => process.getBuiltinModule('node:module').createRequire(__filename)('jose'));

import { MockGauzyApi } from '@/test/ever-id/mock-gauzy-api';
import { MockIssuer } from '@/test/ever-id/mock-issuer';

const CLIENT_ID = 'teams-web-client';
const FORWARD_PATH = '/api/auth/zitadel/backchannel-logout';
const EVER_ID_ENV = [
	'NEXT_PUBLIC_EVER_ID_APP_NAME',
	'EVER_ID_ISSUER_URL',
	'EVER_ID_ISSUER',
	'EVER_ID_CLIENT_ID',
	'EVER_ID_CLIENT_SECRET'
];
const ORIGINAL_ENV = { ...process.env };

type RouteModule = typeof import('./route');

let issuer: MockIssuer;
let gauzy: MockGauzyApi;
let logs: string[];

beforeAll(async () => {
	issuer = await new MockIssuer(CLIENT_ID).start();
	gauzy = await new MockGauzyApi().start();
});

afterAll(async () => {
	await issuer.stop();
	await gauzy.stop();
	process.env = ORIGINAL_ENV;
});

beforeEach(() => {
	gauzy.reset();
	issuer.requests.length = 0;
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

/** Loads the route as a server started with this env (the settings are read when the modules load). */
function loadRoute(configured: boolean, overrides: Record<string, string> = {}): RouteModule {
	for (const key of EVER_ID_ENV) delete process.env[key];
	process.env.GAUZY_API_SERVER_URL = gauzy.origin;
	if (configured) {
		process.env.NEXT_PUBLIC_EVER_ID_APP_NAME = 'Ever ID';
		process.env.EVER_ID_ISSUER_URL = issuer.issuer;
		process.env.EVER_ID_CLIENT_ID = CLIENT_ID;
		process.env.EVER_ID_CLIENT_SECRET = 'teams-web-secret';
	}
	Object.assign(process.env, overrides);
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		mod = require('./route');
	});
	return mod as RouteModule;
}

function postForm(form: Record<string, string>) {
	return new Request('https://teams.example.test/api/auth/ever-id/backchannel-logout', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(form).toString()
	});
}

async function logoutToken(overrides: Record<string, unknown> = {}) {
	return issuer.sign(issuer.logoutClaims(overrides));
}

describe('POST /api/auth/ever-id/backchannel-logout', () => {
	it('answers 404 and contacts nobody while Ever ID is not configured', async () => {
		const { POST } = loadRoute(false);

		const res = await POST(postForm({ logout_token: await logoutToken() }));

		expect(res.status).toBe(404);
		expect(issuer.requests).toEqual([]);
		expect(gauzy.requests).toEqual([]);
	});

	it('verifies a valid token, forwards it to the API once (form encoded) and answers 200', async () => {
		const { POST } = loadRoute(true);
		const token = await logoutToken();

		const res = await POST(postForm({ logout_token: token }));

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		const forwards = gauzy.calls('POST', FORWARD_PATH);
		expect(forwards).toHaveLength(1);
		expect(forwards[0].contentType).toContain('application/x-www-form-urlencoded');
		expect(forwards[0].body).toEqual({ logout_token: token });
		expect(logs.join('\n')).toContain('ever_id.backchannel outcome=ok');
	});

	it('refuses the same token a second time (replay) and does not forward it again', async () => {
		const { POST } = loadRoute(true);
		const token = await logoutToken();

		expect((await POST(postForm({ logout_token: token }))).status).toBe(200);
		expect((await POST(postForm({ logout_token: token }))).status).toBe(400);

		expect(gauzy.calls('POST', FORWARD_PATH)).toHaveLength(1);
		expect(logs.join('\n')).toContain('ever_id.backchannel outcome=replay');
	});

	it.each([
		['issued 301 s ago', { iat: Math.floor(Date.now() / 1000) - 301 }, 'stale'],
		['for another audience', { aud: 'another-client' }, 'invalid'],
		['from another issuer', { iss: 'https://other.example.test' }, 'invalid'],
		['carrying a nonce', { nonce: 'n' }, 'invalid'],
		['without events', { events: undefined }, 'invalid'],
		['naming neither a session nor a subject', { sid: undefined, sub: undefined }, 'invalid'],
		['without a jti', { jti: undefined }, 'invalid']
	])('answers 400 for a token %s and forwards nothing', async (_label, overrides, outcome) => {
		const { POST } = loadRoute(true);

		const res = await POST(postForm({ logout_token: await logoutToken(overrides) }));

		expect(res.status).toBe(400);
		expect(gauzy.calls('POST', FORWARD_PATH)).toHaveLength(0);
		expect(logs.join('\n')).toContain(`ever_id.backchannel outcome=${outcome}`);
	});

	it('answers 400 for anything but a form with a logout token', async () => {
		const { POST } = loadRoute(true);
		const token = await logoutToken();
		const json = new Request('https://teams.example.test/api/auth/ever-id/backchannel-logout', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ logout_token: token })
		});

		expect((await POST(json)).status).toBe(400);
		expect((await POST(postForm({ token }))).status).toBe(400);
		expect((await POST(postForm({}))).status).toBe(400);
		expect(gauzy.calls('POST', FORWARD_PATH)).toHaveLength(0);
	});

	it('accepts and forwards a token naming only the subject (the API ends every session of that person)', async () => {
		const { POST } = loadRoute(true);

		const res = await POST(postForm({ logout_token: await logoutToken({ sid: undefined }) }));

		expect(res.status).toBe(200);
		expect(gauzy.calls('POST', FORWARD_PATH)).toHaveLength(1);
	});

	it('answers 200 when the API refuses the token (sending it again would not help), and logs it', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', FORWARD_PATH, { status: 400, body: { statusCode: 400, message: 'Bad Request' } });
		const token = await logoutToken();

		expect((await POST(postForm({ logout_token: token }))).status).toBe(200);
		expect((await POST(postForm({ logout_token: token }))).status).toBe(400);
		expect(logs.join('\n')).toContain('ever_id.backchannel outcome=forward_failed');
		expect(logs.join('\n')).toContain('status=400');
	});

	it('answers 503 when the API fails, and accepts the same token again once the API is back', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', FORWARD_PATH, { status: 503, body: { statusCode: 503 } });
		const token = await logoutToken();

		expect((await POST(postForm({ logout_token: token }))).status).toBe(503);
		gauzy.on('POST', FORWARD_PATH, { status: 200 });
		expect((await POST(postForm({ logout_token: token }))).status).toBe(200);

		expect(gauzy.calls('POST', FORWARD_PATH)).toHaveLength(2);
		expect(logs.join('\n')).toContain('ever_id.backchannel outcome=forward_failed');
		expect(logs.join('\n')).toContain('status=503');
	});

	it('gives up on a slow API after 4 s and answers 503 so the identity provider can retry', async () => {
		const { POST } = loadRoute(true);
		gauzy.on(
			'POST',
			FORWARD_PATH,
			() => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 6_000).unref())
		);
		const startedAt = Date.now();

		const res = await POST(postForm({ logout_token: await logoutToken() }));

		expect(res.status).toBe(503);
		expect(Date.now() - startedAt).toBeLessThan(5_500);
		expect(logs.join('\n')).toContain('ever_id.backchannel outcome=forward_failed');
	}, 15_000);

	it('answers 503 when the issuer keys cannot be obtained', async () => {
		const { POST } = loadRoute(true, { EVER_ID_ISSUER_URL: 'http://127.0.0.1:9' });

		const res = await POST(postForm({ logout_token: await logoutToken() }));

		expect(res.status).toBe(503);
		expect(gauzy.calls('POST', FORWARD_PATH)).toHaveLength(0);
	});

	it('never logs the token, the subject or the session id', async () => {
		const { POST } = loadRoute(true);
		const token = await logoutToken({ sub: 'subject-secret-1', sid: 'session-secret-1' });

		await POST(postForm({ logout_token: token }));
		await POST(postForm({ logout_token: token }));

		const logged = logs.join('\n');
		expect(logged).not.toContain(token);
		expect(logged).not.toMatch(/eyJ|subject-secret-1|session-secret-1/);
	});
});
