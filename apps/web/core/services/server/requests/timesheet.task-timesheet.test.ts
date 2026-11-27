/**
 * The daily timesheet request sends every filter as its own query parameter. A stray `activityLevel?` in the path once
 * glued itself to the first key, so Gauzy read `activityLevel?organizationId` and never got the organization.
 */
const mockServerFetch = jest.fn();

jest.mock('@/core/services/server/fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

import { getTaskTimesheetRequest } from './timesheet';

const PARAMS = {
	organizationId: 'org-1',
	tenantId: 'tenant-1',
	startDate: '2026-11-01T00:00:00.000Z',
	endDate: '2026-11-07T23:59:59.999Z',
	timeZone: 'Europe/Paris'
};

function sentPath(): string {
	return (mockServerFetch.mock.calls[0][0] as { path: string }).path;
}

beforeEach(() => {
	mockServerFetch.mockReset();
	mockServerFetch.mockResolvedValue({ data: [] });
});

it('sends the organization, tenant and period as plain query parameters', async () => {
	await getTaskTimesheetRequest(PARAMS, 'token');
	const url = new URL(`http://gauzy${sentPath()}`);
	expect(url.pathname).toBe('/timesheet/time-log');
	expect(url.searchParams.get('organizationId')).toBe('org-1');
	expect(url.searchParams.get('tenantId')).toBe('tenant-1');
	expect(url.searchParams.get('startDate')).toBe(PARAMS.startDate);
	expect(url.searchParams.get('endDate')).toBe(PARAMS.endDate);
	expect(url.searchParams.get('timeZone')).toBe('Europe/Paris');
});

it('adds no parameter that was not asked for', async () => {
	await getTaskTimesheetRequest(PARAMS, 'token');
	const keys = [...new URL(`http://gauzy${sentPath()}`).searchParams.keys()];
	expect(keys.sort()).toEqual(['endDate', 'organizationId', 'startDate', 'tenantId', 'timeZone']);
});

it('keeps the bearer token, method and tenant of the call', async () => {
	await getTaskTimesheetRequest(PARAMS, 'token');
	expect(mockServerFetch.mock.calls[0][0]).toMatchObject({
		method: 'GET',
		bearer_token: 'token',
		tenantId: 'tenant-1'
	});
});
