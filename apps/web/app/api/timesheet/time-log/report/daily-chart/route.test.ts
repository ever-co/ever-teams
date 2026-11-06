/**
 * GET /api/timesheet/time-log/report/daily-chart is the proxy-mode twin of Gauzy's daily chart report. It used to keep
 * only the dates, time zone, grouping and activity level (ever-co/ever-teams#4821), so the Team Dashboard chart
 * ignored the team and member picks and counted manual and idle time: the lists the client sends must reach Gauzy.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1', employee: { id: 'signed-in-employee' } },
		access_token: 'access-token'
	});
	const gauzyAnswer = Response.json([], { status: 200 });
	fetchMock = jest.fn();
	fetchMock.mockResolvedValue(gauzyAnswer);
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

/** The single-value params the client sends with every chart request. */
const baseParams = {
	organizationId: 'organization-1',
	tenantId: 'tenant-1',
	startDate: '2026-10-19T00:00:00.000Z',
	endDate: '2026-10-25T23:59:59.999Z',
	timeZone: 'Europe/Sofia',
	groupBy: 'date',
	'activityLevel[start]': '0',
	'activityLevel[end]': '100'
};

/** A GET of the chart route with this query. */
function chartRequest(query: URLSearchParams): Request {
	const url = `https://app.ever.team/api/timesheet/time-log/report/daily-chart?${query}`;
	return new Request(url);
}

/** The URL Gauzy was called on. */
function upstreamUrl(): URL {
	const calledUrl = String(fetchMock.mock.calls[0][0]);
	return new URL(calledUrl);
}

/** The query Gauzy was asked with. */
function upstreamQuery(): Record<string, string> {
	const { searchParams } = upstreamUrl();
	return Object.fromEntries(searchParams);
}

describe('GET /api/timesheet/time-log/report/daily-chart', () => {
	it('forwards the project, member, task, team and log type lists the client sends', async () => {
		const query = new URLSearchParams({
			...baseParams,
			'projectIds[0]': 'project-1',
			'employeeIds[0]': 'employee-1',
			'employeeIds[1]': 'employee-2',
			'taskIds[0]': 'task-1',
			'teamIds[0]': 'team-1',
			'logType[0]': 'TRACKED'
		});
		const request = chartRequest(query);

		const response = await GET(request);

		expect(response.status).toBe(200);
		const { pathname } = upstreamUrl();
		expect(pathname).toMatch(/\/timesheet\/time-log\/report\/daily-chart$/);
		const forwarded = upstreamQuery();
		expect(forwarded).toEqual({
			...baseParams,
			'projectIds[0]': 'project-1',
			'employeeIds[0]': 'employee-1',
			'employeeIds[1]': 'employee-2',
			'taskIds[0]': 'task-1',
			'teamIds[0]': 'team-1',
			'logType[0]': 'TRACKED'
		});
	});

	it('asks Gauzy the same query as before when the client sends no list', async () => {
		const query = new URLSearchParams(baseParams);
		const request = chartRequest(query);

		await GET(request);

		const forwarded = upstreamQuery();
		expect(forwarded).toEqual(baseParams);
	});
});
