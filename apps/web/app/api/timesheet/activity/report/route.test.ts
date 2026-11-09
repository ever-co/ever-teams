/**
 * GET /api/timesheet/activity/report (proxy mode) forwards the report parameters and the shape the browser asked for
 * (ever-co/ever-gauzy#11730); an unknown or absent shape is not forwarded, and the required parameters are still
 * required.
 */
import { NextRequest } from 'next/server';

const mockAuthenticatedGuard = jest.fn();
const mockGetActivityReport = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/timesheet', () => ({
	...jest.requireActual('@/core/services/server/requests/timesheet'),
	getActivityReportRequest: (...args: unknown[]) => mockGetActivityReport(...args)
}));

import { GET } from './route';

const SIGNED_IN = {
	deny: () => Response.json({ message: 'Unauthorized' }, { status: 401 }),
	user: { id: 'user-1' },
	access_token: 'access-token'
};

const REQUIRED = 'tenantId=tenant-1&organizationId=organization-1&startDate=2026-11-01&endDate=2026-11-07&groupBy=date';

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockGetActivityReport.mockReset();
	mockGetActivityReport.mockResolvedValue({ data: [] });
});

it('forwards shape=lean with the report parameters', async () => {
	const response = await GET(new NextRequest(`http://localhost/api/timesheet/activity/report?${REQUIRED}&shape=lean&employeeIds[0]=employee-1`));
	expect(response.status).toBe(200);
	expect(mockGetActivityReport).toHaveBeenCalledWith(
		expect.objectContaining({ tenantId: 'tenant-1', organizationId: 'organization-1', groupBy: 'date', shape: 'lean', employeeIds: ['employee-1'] }),
		'access-token'
	);
});

it.each(['', '&shape=compact'])('forwards no shape for "%s"', async (query) => {
	await GET(new NextRequest(`http://localhost/api/timesheet/activity/report?${REQUIRED}${query}`));
	expect(mockGetActivityReport).toHaveBeenCalledWith(expect.objectContaining({ shape: undefined }), 'access-token');
});

it('still refuses a request without the required parameters', async () => {
	const response = await GET(new NextRequest('http://localhost/api/timesheet/activity/report?shape=lean'));
	expect(response.status).toBe(400);
	expect(mockGetActivityReport).not.toHaveBeenCalled();
});
