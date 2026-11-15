const mockCookieScope = { organizationId: 'organization-2', tenantId: 'tenant-2' };

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => mockCookieScope.organizationId,
	getTenantIdCookie: () => mockCookieScope.tenantId
}));

import { invoiceScheduleService } from './invoice-schedule.service';

/** The workspace the schedules were read in; the cookies name another one, which a second tab switched to since. */
const READ_IN = { organizationId: 'organization-1', tenantId: 'tenant-1' };

const SAVED = {
	id: 'schedule-1',
	organizationContactId: 'client-1',
	frequency: 'MONTHLY',
	startDay: '2026-11-01',
	grouping: 'PROJECT',
	sendInvoice: false,
	pausedAt: null,
	activeSince: '2026-11-15T09:00:00Z'
};

describe('invoiceScheduleService', () => {
	afterEach(() => jest.restoreAllMocks());

	it('sets and changes a schedule in the workspace it was read in, body and header alike', async () => {
		const post = jest.spyOn(invoiceScheduleService, 'post').mockResolvedValue({ data: SAVED } as never);
		const put = jest.spyOn(invoiceScheduleService, 'put').mockResolvedValue({ data: SAVED } as never);

		await invoiceScheduleService.createSchedule(
			'client-1',
			{ frequency: 'MONTHLY', startDay: '2026-11-01', grouping: 'PROJECT', sendInvoice: false },
			READ_IN
		);
		await invoiceScheduleService.updateSchedule('schedule-1', { paused: true }, READ_IN);

		expect(post).toHaveBeenCalledWith(
			'/invoice-schedules',
			expect.objectContaining({ organizationId: 'organization-1', tenantId: 'tenant-1' }),
			{ tenantId: 'tenant-1' }
		);
		expect(put).toHaveBeenCalledWith(
			'/invoice-schedules/schedule-1',
			{ paused: true, organizationId: 'organization-1', tenantId: 'tenant-1' },
			{ tenantId: 'tenant-1' }
		);
	});
});
