/**
 * The read of a period's logs sends the zone it is given: the page sends the profile's ("Europe/Paris (UTC+01:00)",
 * only the name), and a write's read before it sends the browser's, whose days the new time is placed on.
 */
const mockGetTimeLogs = jest.fn().mockResolvedValue([]);
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));

import { timesheetPageLogsRequestOf } from './use-timesheet-page-logs';

const period = { from: new Date(2026, 10, 9), to: new Date(2026, 10, 15) } as Parameters<
	typeof timesheetPageLogsRequestOf
>[0];
const scope = { tenantId: 't', organizationId: 'o', employeeIds: ['e1'] };

describe('timesheetPageLogsRequestOf', () => {
	it("sends the name of the profile's zone, and a browser zone as it is", async () => {
		await timesheetPageLogsRequestOf(period, { ...scope, userTimeZone: 'Asia/Tokyo (UTC+09:00)' }).queryFn();
		expect(mockGetTimeLogs).toHaveBeenLastCalledWith(expect.objectContaining({ timeZone: 'Asia/Tokyo' }));

		await timesheetPageLogsRequestOf(period, { ...scope, userTimeZone: 'America/New_York' }).queryFn();
		expect(mockGetTimeLogs).toHaveBeenLastCalledWith(
			expect.objectContaining({ timeZone: 'America/New_York', startDate: '2026-11-09', endDate: '2026-11-15' })
		);
	});

	it('keeps a read in another zone apart from the page read in the cache', () => {
		const page = timesheetPageLogsRequestOf(period, { ...scope, userTimeZone: 'Asia/Tokyo (UTC+09:00)' });
		const write = timesheetPageLogsRequestOf(period, { ...scope, userTimeZone: 'UTC' });
		expect(page.queryKey).not.toEqual(write.queryKey);
	});
});
