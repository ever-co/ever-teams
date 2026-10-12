/**
 * /api/ever-connect/*: not mounted unless NEXT_PUBLIC_EVER_CONNECT_ENABLED is exactly 'true'; only the
 * organization-level routes of the allow-list are forwarded (never the installation's connect,
 * disconnect, policy or public-address routes, nor any in-product grant), with the person's own token,
 * the known query parameters and the known body fields only.
 */
let mockSession: { token: string | null; tenant: string | null } = { token: 'person-token', tenant: 'tenant-1' };

/** The cookies the sign-in sets, from `mockSession` (none when signed out). */
function sessionCookies(): Record<string, string> {
	const parts = [
		mockSession.token ? `auth-token=${mockSession.token}` : null,
		mockSession.tenant ? `auth-tenant-id=${mockSession.tenant}` : null
	].filter(Boolean);
	return parts.length ? { cookie: parts.join('; ') } : {};
}

import { DELETE, GET, POST, PUT } from './route';

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;
const ORG = '11111111-1111-4111-8111-111111111111';
const LINK_ID = '22222222-2222-4222-8222-222222222222';

let fetchMock: jest.Mock;
let info: jest.SpyInstance;

const handlers = { GET, POST, PUT, DELETE };

function bodyOf(body: unknown): string | undefined {
	if (body === undefined) return undefined;
	return typeof body === 'string' ? body : JSON.stringify(body);
}

function call(method: keyof typeof handlers, path: string, body?: unknown) {
	const url = new URL(`https://teams.example.test/api/ever-connect/${path}`);
	const segments = url.pathname.replace('/api/ever-connect/', '').split('/');
	return handlers[method](
		new Request(url, { method, headers: sessionCookies(), body: bodyOf(body) }),
		{ params: Promise.resolve({ path: segments }) }
	);
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, GAUZY_API_SERVER_URL: 'http://api.example.test', NEXT_PUBLIC_EVER_CONNECT_ENABLED: 'true' };
	mockSession = { token: 'person-token', tenant: 'tenant-1' };
	fetchMock = jest.fn(async () => new Response(JSON.stringify({ connected: true }), { status: 200, headers: { 'content-type': 'application/json' } }));
	global.fetch = fetchMock as unknown as typeof fetch;
	info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
	process.env = ORIGINAL_ENV;
	global.fetch = ORIGINAL_FETCH;
	info.mockRestore();
});

describe('with NEXT_PUBLIC_EVER_CONNECT_ENABLED not exactly "true"', () => {
	it.each([undefined, 'false', 'TRUE', '1'])('%p: every route answers 404 and no request is made', async (value) => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		if (value === undefined) delete process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED;
		else process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = value;
		const answers = await Promise.all([
			call('GET', 'health'),
			call('GET', 'status'),
			call('POST', 'links', { link_code: 'EVL-ABCD-EFGH-JKMN' })
		]);
		expect(answers.map((answer) => answer.status)).toEqual([404, 404, 404]);
		expect(fetchMock).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe('the allow-list', () => {
	it('forwards health with the person own token and tenant, to the configured API, no-store', async () => {
		const answer = await call('GET', 'health');
		expect(answer.status).toBe(200);
		expect(answer.headers.get('cache-control')).toBe('no-store');
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('http://api.example.test/api/ever-connect/health');
		expect(init.headers).toMatchObject({ authorization: 'Bearer person-token', 'tenant-id': 'tenant-1' });
		expect(init.redirect).toBe('manual');
	});

	it.each([
		['POST', 'connect'],
		['POST', 'disconnect'],
		['POST', 'connection/check'],
		['GET', 'policy'],
		['PUT', 'policy/stats_link'],
		['PUT', 'public-url'],
		['POST', 'integrations/stats_link/accept'],
		['POST', 'integrations/stats_link/grant'],
		['POST', 'step-up'],
		['GET', 'links'],
		['DELETE', 'links/not-a-uuid'],
		['GET', '../user/me'],
		['POST', 'health']
	] as const)('%s %s answers 404 without a request (not on the allow-list)', async (method, path) => {
		const answer = await call(method, path, method === 'GET' || method === 'DELETE' ? undefined : {});
		expect(answer.status).toBe(404);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('forwards only the known query parameters, each with its shape', async () => {
		await call('GET', `audit?organizationId=${ORG}&page=2&limit=20&integration=stats_link&tenantId=other&redirect=https://x.test`);
		const url = new URL(String(fetchMock.mock.calls[0][0]));
		expect(url.pathname).toBe('/api/ever-connect/audit');
		expect(Object.fromEntries(url.searchParams)).toEqual({ organizationId: ORG, page: '2', limit: '20', integration: 'stats_link' });
	});

	it('forwards a link code only, and refuses a malformed one without a request', async () => {
		await call('POST', `links?organizationId=${ORG}`, { link_code: 'EVL-ABCD-EFGH-JKMN', email: 'someone@example.com' });
		expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ link_code: 'EVL-ABCD-EFGH-JKMN' });
		fetchMock.mockClear();
		const refused = await call('POST', 'links', { link_code: 'EVL-ILOU-0000-0000' });
		expect(refused.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('forwards the switch of one integration as a boolean only', async () => {
		await call('PUT', 'integrations/stats_link', { enabled: false, scope: 'everything' });
		expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ enabled: false });
		fetchMock.mockClear();
		expect((await call('PUT', 'integrations/stats_link', { enabled: 'no' })).status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('removes a link by its id and mirrors the 204', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
		const answer = await call('DELETE', `links/${LINK_ID}`);
		expect(answer.status).toBe(204);
		expect(String(fetchMock.mock.calls[0][0])).toBe(`http://api.example.test/api/ever-connect/links/${LINK_ID}`);
	});

	it('mirrors the status of the API (404 when it has no Ever Platform module)', async () => {
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: 404 }), { status: 404 }));
		expect((await call('GET', 'health')).status).toBe(404);
	});

	it('answers 401 without a signed-in person, and asks nobody', async () => {
		mockSession = { token: null, tenant: null };
		expect((await call('GET', 'health')).status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
