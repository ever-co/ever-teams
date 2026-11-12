import qs from 'qs';

const mockCookieScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => mockCookieScope.organizationId,
	getTenantIdCookie: () => mockCookieScope.tenantId
}));

import { invoiceService } from './invoice.service';

function invoicesFrom(first: number, count: number) {
	return Array.from({ length: count }, (_, index) => ({ id: `invoice-${first + index}` }));
}

function queryOf(url: unknown): Record<string, unknown> {
	return qs.parse(String(url).split('?')[1] ?? '');
}

describe('reading the invoices already saved for a client, a page at a time', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		mockCookieScope.organizationId = 'organization-1';
		mockCookieScope.tenantId = 'tenant-1';
	});

	it('asks every page of the organization the read started in, even when another one is chosen meanwhile', async () => {
		const get = jest
			.spyOn(invoiceService, 'get')
			.mockImplementationOnce(async () => {
				// A team of another organization is chosen while the first page is read
				mockCookieScope.organizationId = 'organization-2';
				mockCookieScope.tenantId = 'tenant-2';
				return { data: { items: invoicesFrom(1, 100), total: 150 } } as never;
			})
			.mockResolvedValueOnce({ data: { items: invoicesFrom(101, 50), total: 150 } } as never);

		const invoices = await invoiceService.getClientInvoices('client-acme');

		expect(invoices).toHaveLength(150);
		const scopes = get.mock.calls.map(([url]) => {
			const where = queryOf(url).where as Record<string, unknown>;
			return [where.organizationId, where.tenantId, where.toContactId];
		});
		const firstScope = ['organization-1', 'tenant-1', 'client-acme'];
		expect(scopes).toEqual([firstScope, firstScope]);
		const tenantHeaders = get.mock.calls.map(([, config]) => config?.tenantId);
		expect(tenantHeaders).toEqual(['tenant-1', 'tenant-1']);
	});
});
