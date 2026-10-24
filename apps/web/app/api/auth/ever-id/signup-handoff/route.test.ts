/**
 * POST /api/auth/ever-id/signup-handoff: what the sign-up page shows for an Ever ID sign-up (the verified
 * name and e-mail address, and the documents to accept with their links, in the page's language). It creates
 * nothing. The one-time key comes from the sealed cookie the sign-in set. Runs against a stand-in of the Gauzy API
 * that answers like its Ever ID routes.
 */
import { MockGauzyApi, REQUIRED_TERMS, busyAnswer, throttledAnswer } from '@/test/ever-id/mock-gauzy-api';

const DETAILS_PATH = '/api/auth/zitadel/signup/details';
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

/** Whether a response drops the step cookie. */
function clearsStepCookie(res: Response): boolean {
	return /ever-id-handoff=;.*Max-Age=0/i.test(res.headers.get('set-cookie') ?? '');
}

describe('POST /api/auth/ever-id/signup-handoff', () => {
	it('answers 404 and calls nothing while Ever ID is not configured', async () => {
		const { POST } = loadRoute(false);

		const res = await POST(post({}));

		expect(res.status).toBe(404);
		expect(gauzy.requests).toEqual([]);
	});

	it('answers the verified name and e-mail address and the documents with their links, and creates nothing', async () => {
		const { POST } = loadRoute(true);

		const res = await POST(post({ locale: 'fr' }));

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		const body = await res.json();
		expect(Object.keys(body).sort()).toEqual(['email', 'flow', 'name', 'terms']);
		expect(body.name).toBe('New Person');
		expect(body.email).toBe('new.person@example.test');
		expect(body.terms).toEqual(
			REQUIRED_TERMS.map(({ documentId, version, sha256, locale, title, url }) => ({
				documentId,
				version,
				sha256,
				locale,
				title,
				url
			}))
		);
		// A fingerprint of the key, never the key itself.
		expect(body.flow).toBe(
			require('node:crypto').createHash('sha256').update(HANDOFF).digest('base64url').slice(0, 16)
		);
		expect(JSON.stringify(body)).not.toContain(HANDOFF);
		const calls = gauzy.calls('POST', DETAILS_PATH);
		expect(calls.map((call) => call.body)).toEqual([{ handoff: HANDOFF }]);
		// The documents follow the page's language (the sign-up sends the same one).
		expect(calls.map((call) => call.language)).toEqual(['fr']);
		// Reading the confirmation never creates the account.
		expect(gauzy.calls('POST', '/api/auth/zitadel/signup')).toEqual([]);
	});

	it.each([
		['no locale', {}, 'en'],
		['a locale with a region', { locale: 'pt-BR' }, 'pt'],
		['a locale the API does not have', { locale: 'sv' }, 'en'],
		['a malformed locale', { locale: 'fr;drop' }, 'en']
	])('asks for the documents in English or the page language for %s', async (_label, body, language) => {
		const { POST } = loadRoute(true);

		await POST(post(body));

		expect(gauzy.calls('POST', DETAILS_PATH).map((call) => call.language)).toEqual([language]);
	});

	it.each([
		['https', 'https://billing.example.test/checkout/1', 'https://billing.example.test/checkout/1'],
		['plain http (dropped)', 'http://billing.example.test/checkout/1', undefined],
		['missing', undefined, undefined]
	])('passes on a checkout link of a sign-up that waits for a subscription: %s', async (_label, link, expected) => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, {
			status: 200,
			body: {
				email: 'new.person@example.test',
				status: 'subscription_required',
				checkoutUrl: link,
				terms: REQUIRED_TERMS
			}
		});

		const body = await (await POST(post({}))).json();

		expect(body.checkoutUrl).toBe(expected);
	});

	it.each([
		['a used or expired key (410)', { status: 410, body: { statusCode: 410 } }, 410, 'expired', true],
		["the API's limit for this key (429)", throttledAnswer(30), 429, 'throttled', false],
		['an API failure (500)', { status: 500, body: {} }, 502, 'unavailable', false],
		[
			'details without an e-mail address',
			{ status: 200, body: { firstName: 'New', terms: REQUIRED_TERMS } },
			502,
			'unavailable',
			false
		],
		['the routes switched off (404)', { status: 404, body: { statusCode: 404 } }, 502, 'unavailable', false]
	])('maps %s', async (_label, answer, status, reason, dropsCookie) => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, answer);

		const res = await POST(post({}));

		expect(res.status).toBe(status);
		expect((await res.json()).reason).toBe(reason);
		expect(clearsStepCookie(res)).toBe(dropsCookie);
	});

	it('gives the Retry-After of the API for its limit on this key', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, throttledAnswer(30));

		const res = await POST(post({}));

		expect(res.headers.get('retry-after')).toBe('30');
	});

	it('tries again while a sign-up with this key runs, and answers 429 if it still does', async () => {
		const { POST } = loadRoute(true);
		let calls = 0;
		gauzy.on('POST', DETAILS_PATH, () =>
			++calls === 1
				? busyAnswer(1)
				: { status: 200, body: { email: 'new.person@example.test', terms: REQUIRED_TERMS } }
		);
		expect((await POST(post({}))).status).toBe(200);
		expect(gauzy.calls('POST', DETAILS_PATH)).toHaveLength(2);

		gauzy.on('POST', DETAILS_PATH, busyAnswer(1));
		const busy = await POST(post({}));
		expect(busy.status).toBe(429);
		expect(busy.headers.get('retry-after')).toBe('1');
		expect(clearsStepCookie(busy)).toBe(false);
	}, 15_000);

	it.each([
		['is not a list', { email: 'new.person@example.test', terms: { documents: [] } }],
		['is missing', { email: 'new.person@example.test' }],
		[
			'has a document without its digest',
			{ email: 'new.person@example.test', terms: [REQUIRED_TERMS[0], { ...REQUIRED_TERMS[1], sha256: 'x' }] }
		],
		[
			'has a document without its version',
			{ email: 'new.person@example.test', terms: [{ ...REQUIRED_TERMS[0], version: '' }] }
		],
		[
			'has a document without a link to open it',
			{ email: 'new.person@example.test', terms: [{ ...REQUIRED_TERMS[0], url: undefined }] }
		],
		[
			'has a document with a relative link',
			{ email: 'new.person@example.test', terms: [{ ...REQUIRED_TERMS[0], url: '/legal/tos' }] }
		]
	])(
		'answers 502 when the list of documents to accept %s (no document is dropped or shown unlinked)',
		async (_label, body) => {
			const { POST } = loadRoute(true);
			gauzy.on('POST', DETAILS_PATH, { status: 200, body });

			const res = await POST(post({}));

			expect(res.status).toBe(502);
			expect((await res.json()).reason).toBe('unavailable');
		}
	);

	it.each([
		['no cookie', null],
		[
			'a cookie this server did not seal',
			`ever-id-handoff=${require('node:crypto').randomBytes(64).toString('base64url')}`
		],
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

	it('reads one key at most nine times a minute, below the API limit; then 429 with when to try again', async () => {
		let clock = Date.now();
		jest.spyOn(Date, 'now').mockImplementation(() => clock);
		const { POST } = loadRoute(true);

		const statuses: number[] = [];
		for (let attempt = 0; attempt < 9; attempt++) statuses.push((await POST(post({}))).status);
		clock += 20_000;
		const limited = await POST(post({}));

		expect(statuses).toEqual(Array(9).fill(200));
		expect(limited.status).toBe(429);
		expect(limited.headers.get('retry-after')).toBe('40');
		expect(clearsStepCookie(limited)).toBe(false);
		expect(gauzy.calls('POST', DETAILS_PATH)).toHaveLength(9);
	});

	it('does not count a read the API could not complete', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, { status: 500, body: {} });

		const statuses: number[] = [];
		for (let attempt = 0; attempt < 12; attempt++) statuses.push((await POST(post({}))).status);

		expect(statuses).toEqual(Array(12).fill(502));
		expect(gauzy.calls('POST', DETAILS_PATH)).toHaveLength(12);
	});
});
