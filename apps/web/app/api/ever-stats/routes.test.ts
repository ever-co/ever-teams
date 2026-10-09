/**
 * /api/ever-stats/{status,last,enabled}: the paired API decides who the operator is; this app adds its
 * own reporter only after the API's 200, mirrors every refusal, forwards the person's own token and
 * tenant, forwards a boolean only, and answers 404 without any request when its statistics are off.
 */
let mockSession: { token: string | null; tenant: string | null } = { token: 'person-token', tenant: 'tenant-1' };

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => mockSession.token,
	getTenantIdCookie: () => mockSession.tenant
}));

import { GET as getStatus } from './status/route';
import { GET as getLast } from './last/route';
import { PUT as putEnabled } from './enabled/route';
import { recordAttempt, reporterState, resetReporterState } from '@/core/services/server/ever-stats/state';

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;
const OPERATOR_STATUS = { enabled: true, reason: null, install_source: 'self-hosted', serves: ['gauzy', 'teams'] };

let fetchMock: jest.Mock;
let info: jest.SpyInstance;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function answering(routes: Record<string, () => Response>) {
	fetchMock = jest.fn(async (input: RequestInfo | URL) => {
		const path = new URL(String(input)).pathname;
		const route = routes[path];
		if (!route) throw new Error(`unexpected request ${path}`);
		return route();
	});
	global.fetch = fetchMock as unknown as typeof fetch;
}

const request = (path: string, init?: RequestInit) => new Request(`https://teams.example.test${path}`, init);

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, GAUZY_API_SERVER_URL: 'http://api.example.test' };
	delete process.env.EVER_STATS_ENABLED;
	delete process.env.EVER_INSTALL_SOURCE;
	mockSession = { token: 'person-token', tenant: 'tenant-1' };
	resetReporterState();
	info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
	answering({});
});

afterEach(() => {
	process.env = ORIGINAL_ENV;
	global.fetch = ORIGINAL_FETCH;
	info.mockRestore();
});

describe('with EVER_STATS_ENABLED=false', () => {
	it('every route answers 404 and makes no request', async () => {
		process.env.EVER_STATS_ENABLED = 'false';
		const answers = await Promise.all([
			getStatus(request('/api/ever-stats/status')),
			getLast(request('/api/ever-stats/last')),
			putEnabled(request('/api/ever-stats/enabled', { method: 'PUT', body: '{"enabled":false}' }))
		]);
		expect(answers.map((answer) => answer.status)).toEqual([404, 404, 404]);
		for (const answer of answers) expect(await answer.json()).toEqual({ statusCode: 404, message: 'Not Found' });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('GET /api/ever-stats/status', () => {
	it('answers 401 without a signed-in person, and asks nobody', async () => {
		mockSession = { token: null, tenant: null };
		const answer = await getStatus(request('/api/ever-stats/status'));
		expect(answer.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('adds this app reporter only after the paired API answered 200 to the person', async () => {
		reporterState().status = 'running';
		answering({ '/api/ever-stats/status': () => json(OPERATOR_STATUS) });
		const answer = await getStatus(request('/api/ever-stats/status'));
		expect(answer.status).toBe(200);
		expect(answer.headers.get('cache-control')).toBe('no-store');
		expect(await answer.json()).toEqual({ ...OPERATOR_STATUS, teams: { reporter: 'running', next_send_at: null } });
		const init = fetchMock.mock.calls[0][1] as RequestInit;
		expect(init.headers).toMatchObject({ authorization: 'Bearer person-token', 'tenant-id': 'tenant-1' });
		expect(init.redirect).toBe('manual');
	});

	it.each([403, 404])('answers 404 with who manages the statistics, and no reporter data, when the API answers %p', async (status) => {
		answering({ '/api/ever-stats/status': () => json({ statusCode: status }, status) });
		const answer = await getStatus(request('/api/ever-stats/status'));
		expect(answer.status).toBe(404);
		const body = await answer.json();
		expect(body).toEqual({ statusCode: 404, message: 'Not Found', managed_by: 'operator' });
		expect(body).not.toHaveProperty('teams');
	});

	it('says Ever Cloud manages the statistics on a cloud deployment', async () => {
		process.env.EVER_INSTALL_SOURCE = 'cloud';
		answering({ '/api/ever-stats/status': () => json({ statusCode: 404 }, 404) });
		expect(await (await getStatus(request('/api/ever-stats/status'))).json()).toMatchObject({ managed_by: 'ever_cloud' });
	});

	it('mirrors 401 and turns anything else into 502', async () => {
		answering({ '/api/ever-stats/status': () => json({}, 401) });
		expect((await getStatus(request('/api/ever-stats/status'))).status).toBe(401);
		answering({ '/api/ever-stats/status': () => json({}, 500) });
		expect((await getStatus(request('/api/ever-stats/status'))).status).toBe(502);
		answering({ '/api/ever-stats/status': () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.example.test' } }) });
		expect((await getStatus(request('/api/ever-stats/status'))).status).toBe(502);
	});

	it('answers 404 without any request when no API is configured', async () => {
		delete process.env.GAUZY_API_SERVER_URL;
		delete process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL;
		const answer = await getStatus(request('/api/ever-stats/status'));
		expect(answer.status).toBe(404);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('GET /api/ever-stats/last', () => {
	it('answers the API last report and this app last attempts to the operator', async () => {
		recordAttempt({ payload: '{"schema":"ever.stats.v1"}', sent_at: '2026-11-02T10:00:00.000Z', http_status: 202, outcome: 'sent', period: '2026-11', final: false });
		answering({
			'/api/ever-stats/status': () => json(OPERATOR_STATUS),
			'/api/ever-stats/last': () => json({ payload: '{}', bytes: 2, sent_at: '2026-11-02', http_status: 202, status: 'sent', period: '2026-11' })
		});
		const answer = await getLast(request('/api/ever-stats/last'));
		expect(answer.status).toBe(200);
		const body = await answer.json();
		expect(body.api).toMatchObject({ http_status: 202 });
		expect(body.teams.last).toHaveLength(1);
		expect(body.teams.last[0].payload).toBe('{"schema":"ever.stats.v1"}');
	});

	it('answers 404 and none of this app data to anyone the API does not accept as the operator', async () => {
		recordAttempt({ payload: '{"schema":"ever.stats.v1"}', sent_at: '2026-11-02T10:00:00.000Z', http_status: 202, outcome: 'sent', period: '2026-11', final: false });
		answering({ '/api/ever-stats/status': () => json({ statusCode: 404 }, 404) });
		const answer = await getLast(request('/api/ever-stats/last'));
		expect(answer.status).toBe(404);
		expect(JSON.stringify(await answer.json())).not.toContain('ever.stats.v1');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('PUT /api/ever-stats/enabled', () => {
	it('forwards the person token, the tenant and the boolean only', async () => {
		answering({ '/api/ever-stats/enabled': () => json({ ...OPERATOR_STATUS, enabled: false }) });
		const answer = await putEnabled(
			request('/api/ever-stats/enabled', { method: 'PUT', body: JSON.stringify({ enabled: false }) })
		);
		expect(answer.status).toBe(200);
		const init = fetchMock.mock.calls[0][1] as RequestInit;
		expect(init.method).toBe('PUT');
		expect(init.headers).toMatchObject({ authorization: 'Bearer person-token', 'tenant-id': 'tenant-1' });
		expect(JSON.parse(String(init.body))).toEqual({ enabled: false });
	});

	it.each(['{"enabled":"false"}', '{"enabled":false,"tenantId":"other"}', 'not json', '{}'])(
		'answers 400 to %p without forwarding it',
		async (body) => {
			const answer = await putEnabled(request('/api/ever-stats/enabled', { method: 'PUT', body }));
			expect(answer.status).toBe(400);
			expect(fetchMock).not.toHaveBeenCalled();
		}
	);

	it('answers 404 to anyone the API does not accept as the operator', async () => {
		answering({ '/api/ever-stats/enabled': () => json({ statusCode: 404 }, 404) });
		const answer = await putEnabled(request('/api/ever-stats/enabled', { method: 'PUT', body: '{"enabled":true}' }));
		expect(answer.status).toBe(404);
	});
});
