/**
 * The proxy's activity report request forwards the shape the browser asked for (ever-co/ever-gauzy#11730) after the
 * report's own parameters, and sends none when it asked for none.
 */
const mockServerFetch = jest.fn();

jest.mock('@/core/services/server/fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

import { getActivityReportRequest } from './timesheet';

const REPORT = {
	organizationId: 'org-1',
	tenantId: 'tenant-1',
	startDate: '2026-11-01T00:00:00.000Z',
	endDate: '2026-11-07T23:59:59.999Z',
	timeZone: 'UTC',
	groupBy: 'date',
	activityLevel: { start: 0, end: 100 },
	employeeIds: ['employee-1']
};

/** The query string of the one request serverFetch received. */
function sentQuery(): URLSearchParams {
	const { path } = mockServerFetch.mock.calls[0][0] as { path: string };
	return new URL(`http://gauzy${path}`).searchParams;
}

beforeEach(() => {
	mockServerFetch.mockReset();
	mockServerFetch.mockResolvedValue({ data: [] });
});

it('forwards shape=lean with the report parameters intact', async () => {
	await getActivityReportRequest({ ...REPORT, shape: 'lean' }, 'token');
	const query = sentQuery();
	expect(query.get('shape')).toBe('lean');
	expect(query.get('groupBy')).toBe('date');
	expect(query.get('activityLevel[end]')).toBe('100');
	expect(query.get('employeeIds[0]')).toBe('employee-1');
	expect(mockServerFetch.mock.calls[0][0]).toMatchObject({ method: 'GET', bearer_token: 'token', tenantId: 'tenant-1' });
});

it('forwards shape=full as asked', async () => {
	await getActivityReportRequest({ ...REPORT, shape: 'full' }, 'token');
	expect(sentQuery().get('shape')).toBe('full');
});

it('sends no shape when none was asked for', async () => {
	await getActivityReportRequest(REPORT, 'token');
	expect(sentQuery().has('shape')).toBe(false);
});
