/**
 * POST /api/auth/ever-id/signup-handoff: what the sign-up page shows for an Ever ID sign-up (the verified
 * name and e-mail address, and the documents to accept). It creates nothing. Runs against a stand-in of the
 * Gauzy API that answers like its Ever ID routes.
 */
import { MockGauzyApi, REQUIRED_TERMS } from '@/test/ever-id/mock-gauzy-api';

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

function post(body: unknown) {
	return new Request('https://teams.example.test/api/auth/ever-id/signup-handoff', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

describe('POST /api/auth/ever-id/signup-handoff', () => {
	it('answers 404 and calls nothing while Ever ID is not configured', async () => {
		const { POST } = loadRoute(false);

		const res = await POST(post({ handoff: HANDOFF }));

		expect(res.status).toBe(404);
		expect(gauzy.requests).toEqual([]);
	});

	it('answers only the verified name and e-mail address, and the documents to accept', async () => {
		const { POST } = loadRoute(true);

		const res = await POST(post({ handoff: HANDOFF, locale: 'fr' }));

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
		expect(gauzy.requests.find((request) => request.path === '/api/terms/required')).toBeDefined();
	});

	it('keeps an absolute document link', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('GET', '/api/terms/required', {
			status: 200,
			body: [{ ...REQUIRED_TERMS[0], url: 'https://legal.example.test/tos' }]
		});

		const body = await (await POST(post({ handoff: HANDOFF }))).json();

		expect(body.terms[0].url).toBe('https://legal.example.test/tos');
	});

	it('passes on a checkout link of a sign-up that waits for a subscription (https only)', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, {
			status: 200,
			body: {
				email: 'new.person@example.test',
				status: 'subscription_required',
				checkoutUrl: 'https://billing.example.test/checkout/1'
			}
		});

		const body = await (await POST(post({ handoff: HANDOFF }))).json();

		expect(body.checkoutUrl).toBe('https://billing.example.test/checkout/1');
	});

	it('answers 410 for a used or expired key', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('POST', DETAILS_PATH, { status: 410, body: { statusCode: 410 } });

		const res = await POST(post({ handoff: HANDOFF }));

		expect(res.status).toBe(410);
		expect((await res.json()).reason).toBe('expired');
	});

	it('answers 502 when the documents to accept cannot be read', async () => {
		const { POST } = loadRoute(true);
		gauzy.on('GET', '/api/terms/required', { status: 500, body: {} });

		expect((await POST(post({ handoff: HANDOFF }))).status).toBe(502);
	});

	it('answers 400 without calling the API for a malformed key', async () => {
		const { POST } = loadRoute(true);

		expect((await POST(post({ handoff: 'person@example.test' }))).status).toBe(400);
		expect(gauzy.requests).toEqual([]);
	});
});
