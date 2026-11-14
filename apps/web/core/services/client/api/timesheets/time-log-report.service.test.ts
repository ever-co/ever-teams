import qs from 'qs';

const mockCookieScope = { organizationId: 'organization-cookie', tenantId: 'tenant-cookie' };

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => mockCookieScope.organizationId,
	getTenantIdCookie: () => mockCookieScope.tenantId
}));

import { timeLogReportService } from './time-log-report.service';

function queryOf(url: unknown): Record<string, unknown> {
	return qs.parse(String(url).split('?')[1] ?? '');
}

const october = {
	from: new Date('2026-10-01T00:00:00.000Z'),
	to: new Date('2026-10-31T23:59:59.999Z'),
	timeZone: 'UTC',
	projectIds: ['project-site']
};

const keyScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };

describe('reading the billable time of an invoice', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('leaves out the time an invoice bills when asked, and reads all of it otherwise', async () => {
		const get = jest.spyOn(timeLogReportService, 'get').mockResolvedValue({ data: [] } as never);

		await timeLogReportService.getBillableTimeLogs(october, [], { notInvoiced: true, scope: keyScope });
		await timeLogReportService.getBillableTimeLogs(october, [], { notInvoiced: false, scope: keyScope });

		const freeQuery = queryOf(get.mock.calls[0][0]);
		const allQuery = queryOf(get.mock.calls[1][0]);
		expect(freeQuery.notInvoiced).toBe('true');
		expect(freeQuery.billableOnly).toBe('true');
		expect(allQuery).not.toHaveProperty('notInvoiced');
		expect(allQuery.billableOnly).toBe('true');
	});

	it('asks the workspace its cache key holds, not the one another tab left in the cookies', async () => {
		const get = jest.spyOn(timeLogReportService, 'get').mockResolvedValue({ data: [] } as never);

		await timeLogReportService.getBillableTimeLogs(october, ['task'], { notInvoiced: true, scope: keyScope });

		const query = queryOf(get.mock.calls[0][0]);
		expect([query.organizationId, query.tenantId]).toEqual(['organization-1', 'tenant-1']);
		expect(get.mock.calls[0][1]?.tenantId).toBe('tenant-1');
	});

	it('keeps the invoice line each log names, and tells a log no line bills from an API that names none', async () => {
		const answered = [
			{ id: 'log-1', invoiceItemId: 'line-1' },
			{ id: 'log-2', invoiceItemId: null },
			{ id: 'log-3' }
		];
		jest.spyOn(timeLogReportService, 'get').mockResolvedValue({ data: answered } as never);

		const logs = await timeLogReportService.getBillableTimeLogs(october, [], {
			notInvoiced: false,
			scope: keyScope
		});

		expect(logs.map((log) => log.invoiceItemId)).toEqual(['line-1', null, undefined]);
	});
});
