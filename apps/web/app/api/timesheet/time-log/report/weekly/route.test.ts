/**
 * GET /api/timesheet/time-log/report/weekly is the proxy-mode twin of Gauzy's weekly report. A report filtered on
 * billable time must reach Gauzy with that filter, or the week grid would count every log without saying so.
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
		user: { id: 'user-1' },
		access_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1',
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
	startDate: '2026-11-02T00:00:00.000Z',
	endDate: '2026-11-08T23:59:59.999Z',
	timeZone: 'UTC',
	'employeeIds[0]': 'employee-1'
};

function weeklyRequest(query: URLSearchParams) {
	return new Request(`https://app.ever.team/api/timesheet/time-log/report/weekly?${query}`);
}

const upstreamQuery = () => Object.fromEntries(new URL(String(fetchMock.mock.calls[0][0])).searchParams);

describe('GET /api/timesheet/time-log/report/weekly', () => {
	it('asks Gauzy for billable time only when the report does', async () => {
		const query = new URLSearchParams({ ...baseParams, billableOnly: 'true' });

		await GET(weeklyRequest(query));

		expect(upstreamQuery()).toEqual(
			expect.objectContaining({ 'employeeIds[0]': 'employee-1', billableOnly: 'true' })
		);
	});

	it('keeps counting every log for a report that does not ask for it', async () => {
		await GET(weeklyRequest(new URLSearchParams(baseParams)));

		expect(upstreamQuery()).not.toHaveProperty('billableOnly');
	});
});
