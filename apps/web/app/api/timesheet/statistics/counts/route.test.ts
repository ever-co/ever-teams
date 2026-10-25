/**
 * GET /api/timesheet/statistics/counts is the proxy-mode twin of Gauzy's /timesheet/statistics/counts, behind the
 * Team Dashboard and Time and Activity counters. The web client sends the tenant only in the tenant-id header, never
 * in the query (ever-co/ever-teams#4801): without a tenantId in the query the route uses the session tenant cookie,
 * and a tenantId sent in the query still wins.
 */
import { signedIn } from '@/test/auth/guard-answers';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const COUNTS_URL = 'https://app.ever.team/api/timesheet/statistics/counts';

/** The query the web client sends: everything but the tenant. */
const CLIENT_QUERY = {
	'activityLevel[start]': '0',
	'activityLevel[end]': '100',
	'logType[0]': 'TRACKED',
	organizationId: 'organization-1',
	startDate: '2026-10-20T00:00:00.000Z',
	endDate: '2026-10-26T23:59:59.999Z',
	timeZone: 'Etc/UTC'
};

const SESSION_TENANT_COOKIE = 'auth-tenant-id=session-tenant';

const GAUZY_COUNTS = { employeesCount: 3, projectsCount: 2 };

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1' }));
	const gauzyAnswer = Response.json(GAUZY_COUNTS, { status: 200 });
	fetchMock = jest.fn().mockResolvedValue(gauzyAnswer);
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

/** A counts request with `query`, and with `cookie` as the Cookie header the browser adds. */
function countsRequest(query: Record<string, string>, cookie?: string) {
	const search = new URLSearchParams(query);
	const url = `${COUNTS_URL}?${search}`;
	if (!cookie) {
		return new Request(url);
	}
	return new Request(url, { headers: { cookie } });
}

/** The URL and the headers of the call made to Gauzy. */
function upstreamCall() {
	const [rawUrl, init] = fetchMock.mock.calls[0];
	const url = new URL(String(rawUrl));
	return { url, headers: init.headers };
}

describe('GET /api/timesheet/statistics/counts', () => {
	it('uses the session tenant cookie when the query has no tenantId', async () => {
		const request = countsRequest(CLIENT_QUERY, SESSION_TENANT_COOKIE);

		const response = await GET(request);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual(GAUZY_COUNTS);
		const upstream = upstreamCall();
		expect(upstream.url.pathname).toMatch(/\/timesheet\/statistics\/counts$/);
		expect(upstream.headers['tenant-id']).toBe('session-tenant');
	});

	it('keeps a tenantId sent in the query', async () => {
		const query = { ...CLIENT_QUERY, tenantId: 'query-tenant' };
		const request = countsRequest(query, SESSION_TENANT_COOKIE);

		await GET(request);

		const upstream = upstreamCall();
		expect(upstream.headers['tenant-id']).toBe('query-tenant');
	});

	it('still answers 400 without a tenant in the query or the cookies, and asks Gauzy nothing', async () => {
		const request = countsRequest(CLIENT_QUERY);

		const response = await GET(request);

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
