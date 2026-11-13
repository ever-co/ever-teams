/**
 * GET /api/timesheet/time-log/report/daily is the proxy-mode twin of Gauzy's daily report. A team report asks Gauzy to
 * also count the time its members logged without a team; that request must reach Gauzy as sent.
 */
import type { NextRequest } from 'next/server';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		user: { id: 'user-1', employee: { id: 'signed-in-employee' } },
		access_token: 'access-token',
		deny: () => new Response(null, { status: 401 })
	});
	fetchMock = jest.fn().mockResolvedValue(Response.json([], { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

const baseParams = {
	organizationId: 'organization-1',
	tenantId: 'tenant-1',
	startDate: '2026-11-05T00:00:00.000Z',
	endDate: '2026-11-05T23:59:59.999Z',
	groupBy: 'date',
	'teamIds[0]': 'team-1'
};

function dailyRequest(query: URLSearchParams) {
	const url = new URL(`https://app.ever.team/api/timesheet/time-log/report/daily?${query}`);
	return { nextUrl: url, url: url.toString(), headers: new Headers() } as unknown as NextRequest;
}

const upstreamQuery = () => Object.fromEntries(new URL(String(fetchMock.mock.calls[0][0])).searchParams);

describe('GET /api/timesheet/time-log/report/daily', () => {
	it('asks Gauzy for the time without a team when the team report does', async () => {
		const query = new URLSearchParams({ ...baseParams, includeTimeWithoutTeam: 'true' });

		await GET(dailyRequest(query));

		expect(upstreamQuery()).toEqual(
			expect.objectContaining({ 'teamIds[0]': 'team-1', includeTimeWithoutTeam: 'true' })
		);
	});

	it('leaves it out of a report that does not ask for it', async () => {
		await GET(dailyRequest(new URLSearchParams(baseParams)));

		expect(upstreamQuery()).not.toHaveProperty('includeTimeWithoutTeam');
	});

	it('asks Gauzy for billable time only when the report does', async () => {
		const query = new URLSearchParams({ ...baseParams, billableOnly: 'true' });

		await GET(dailyRequest(query));

		expect(upstreamQuery()).toEqual(expect.objectContaining({ billableOnly: 'true' }));
	});

	it('keeps counting every log for a report that does not ask for billable time only', async () => {
		await GET(dailyRequest(new URLSearchParams({ ...baseParams, billableOnly: 'false' })));

		expect(upstreamQuery()).not.toHaveProperty('billableOnly');
	});
});
