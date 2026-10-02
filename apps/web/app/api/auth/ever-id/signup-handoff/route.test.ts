/**
 * POST /api/auth/ever-id/signup-handoff: what the sign-up page shows for an Ever ID sign-up (the verified
 * name and e-mail address, and the documents to accept). It creates nothing. The one-time key comes from the
 * sealed cookie the sign-in set. Runs against a stand-in of the Gauzy API that answers like its Ever ID routes.
 */
import { MockGauzyApi, REQUIRED_TERMS } from '@/test/ever-id/mock-gauzy-api';

const DETAILS_PATH = '/api/auth/zitadel/signup/details';
const TERMS_PATH = '/api/terms/required';
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
function stepCookie(step: 'confirm' | 'signup' = 'signup', key = HANDOFF): string {
	let value = '';
	jest.isolateModules(() => {
		value = require('@/core/lib/auth/ever-id/handoff').sealEverIdHandoff(key, step);
	});
	return `ever-id-handoff=${value}`;
}

function post(body: unknown, cookie: string | null = stepCookie()) {
	return new Request('https://teams.example.test/api/auth/ever-id/signup-handoff', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
		body: JSON.stringify(body)
	});
}

describe('POST /api/auth/ever-id/signup-handoff', () => {
	it('answers 404 and calls nothing while Ever ID is not configured', async () => {
		const { POST } = loadRoute(false);

		const res = await POST(post({}));

		expect(res.status).toBe(404);
		expect(gauzy.requests).toEqual([]);
	});

	it('answers only the verified name and e-mail address, and the documents to accept, and creates nothing', async () => {
		const { POST } = loadRoute(true);

		const res = await POST(post({ locale: 'fr' }));

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		const body = await res.json();
		expect(Object.keys(body).sort()).toEqual(['email', 'name', 'terms']);
		expect(body.name).toBe('New Person');
		expect(body.email).toBe('new.person@example.test');
		// A document path is relative to the API's own web app, so no link is offered for it here.
		expect(body.terms).toEqual(
			REQUIRED_TERMS.map(({ documentId, version, sha256, locale, title }) => ({
				documentId,
				version,
				sha256,
				locale,
				title
			}))
		);
		expect(gauzy.calls('POST', DETAILS_PATH).map((call) => call.body)).toEqual([{ handoff: HANDOFF }]);
		expect(gauzy.calls('GET', TERMS_PATH).map((call) => call.search)).toEqual(['?locale=fr']);
		// Reading the confirmation never creates the account.
		expect(gauzy.calls('POST', '/api/auth/zitadel/signup')).toEqual([]);
	});

	it('asks for the documents without a locale when none (or a malformed one) is given', async () => {
		const { POST } = loadRoute(true);

		await POST(post({ locale: 'fr;drop' }));

		expect(gauzy.calls('GET', TERMS_PATH).map((call) => call.search)).toEqual(['']);
	});

	it('keeps an absolute document link', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('GET', TERMS_PATH, {
			status: 200,
			body: [{ ...REQUIRED_TERMS[0], url: 'https://legal.example.test/tos' }]
		});

		const body = await (await POST(post({}))).json();

		expect(body.terms[0].url).toBe('https://legal.example.test/tos');
	});

	it.each([
		['https', 'https://billing.example.test/checkout/1', 'https://billing.example.test/checkout/1'],
		['plain http (dropped)', 'http://billing.example.test/checkout/1', undefined],
		['missing', undefined, undefined]
	])('passes on a checkout link of a sign-up that waits for a subscription: %s', async (_label, link, expected) => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, {
			status: 200,
			body: { email: 'new.person@example.test', status: 'subscription_required', checkoutUrl: link }
		});

		const body = await (await POST(post({}))).json();

		expect(body.checkoutUrl).toBe(expected);
	});

	it.each([
		['a used or expired key (410)', { status: 410, body: { statusCode: 410 } }, 410, 'expired'],
		["the API's rate limit (429)", { status: 429, body: {} }, 429, 'throttled'],
		['an API failure (500)', { status: 500, body: {} }, 502, 'unavailable'],
		['details without an e-mail address', { status: 200, body: { firstName: 'New' } }, 502, 'unavailable'],
		['the routes switched off (404)', { status: 404, body: { statusCode: 404 } }, 502, 'unavailable']
	])('maps %s', async (_label, answer, status, reason) => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, answer);

		const res = await POST(post({}));

		expect(res.status).toBe(status);
		expect((await res.json()).reason).toBe(reason);
	});

	it('reports a used key as such, without asking for the documents', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, { status: 410, body: {} });
		gauzy.on('GET', TERMS_PATH, { status: 500, body: {} });

		const res = await POST(post({}));

		expect(res.status).toBe(410);
		expect(res.headers.get('set-cookie')).toMatch(/ever-id-handoff=;.*Max-Age=0/i);
		expect(gauzy.calls('GET', TERMS_PATH)).toEqual([]);
	});

	it.each([
		['cannot be read', { status: 500, body: {} }],
		['is not a list', { status: 200, body: { documents: [] } }],
		[
			'has a document without its digest',
			{ status: 200, body: [REQUIRED_TERMS[0], { ...REQUIRED_TERMS[1], sha256: 'x' }] }
		],
		['has a document without its version', { status: 200, body: [{ ...REQUIRED_TERMS[0], version: '' }] }]
	])('answers 502 when the list of documents to accept %s (no document is ever dropped)', async (_label, answer) => {
		const { POST } = loadRoute(true);
		gauzy.on('GET', TERMS_PATH, answer);

		const res = await POST(post({}));

		expect(res.status).toBe(502);
		expect((await res.json()).reason).toBe('unavailable');
	});

	it.each([
		['no cookie', null],
		['a cookie this server did not seal', `ever-id-handoff=${Buffer.from('forged').toString('base64url')}`],
		['the cookie of the code step', stepCookie('confirm')]
	])('answers 410 without calling the API for %s', async (_label, cookie) => {
		const { POST } = loadRoute(true);

		expect((await POST(post({}, cookie))).status).toBe(410);
		expect(gauzy.requests).toEqual([]);
	});

	it('answers 400 without calling the API for a body that is not JSON', async () => {
		const { POST } = loadRoute(true);
		const request = new Request('https://teams.example.test/api/auth/ever-id/signup-handoff', {
			method: 'POST',
			headers: { 'content-type': 'text/plain', cookie: stepCookie() },
			body: 'locale=fr'
		});

		expect((await POST(request)).status).toBe(400);
		expect(gauzy.requests).toEqual([]);
	});

	it('reads one key at most ten times, then answers 429 without calling the API', async () => {
		const { POST } = loadRoute(true);

		const statuses: number[] = [];
		for (let attempt = 0; attempt < 11; attempt++) statuses.push((await POST(post({}))).status);

		expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
		expect(statuses[10]).toBe(429);
		expect(gauzy.calls('POST', DETAILS_PATH)).toHaveLength(10);
	});
});
