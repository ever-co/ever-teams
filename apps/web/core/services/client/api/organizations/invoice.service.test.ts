import qs from 'qs';

const mockCookieScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => mockCookieScope.organizationId,
	getTenantIdCookie: () => mockCookieScope.tenantId
}));

import { VOID_CHANGE } from '@/core/lib/utils/invoice-actions';
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

describe('reading a page of the invoices list', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		mockCookieScope.organizationId = 'organization-1';
		mockCookieScope.tenantId = 'tenant-1';
	});

	it('asks the organization its cache key holds, not the one another tab left in the cookies', async () => {
		mockCookieScope.organizationId = 'organization-2';
		mockCookieScope.tenantId = 'tenant-2';
		const get = jest
			.spyOn(invoiceService, 'get')
			.mockResolvedValue({ data: { items: invoicesFrom(1, 3), total: 3 } } as never);

		await invoiceService.getInvoices({
			page: 2,
			scope: { organizationId: 'organization-1', tenantId: 'tenant-1' }
		});

		const where = queryOf(get.mock.calls[0][0]).where as Record<string, unknown>;
		expect([where.organizationId, where.tenantId]).toEqual(['organization-1', 'tenant-1']);
		expect(get.mock.calls[0][1]?.tenantId).toBe('tenant-1');
	});
});

describe('e-mailing, settling and deleting an invoice in the workspace the list was read in', () => {
	const listScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };

	beforeEach(() => {
		mockCookieScope.organizationId = 'organization-2';
		mockCookieScope.tenantId = 'tenant-2';
	});

	afterEach(() => {
		jest.restoreAllMocks();
		mockCookieScope.organizationId = 'organization-1';
		mockCookieScope.tenantId = 'tenant-1';
	});

	it('e-mails the invoice as the organization of the list, not the one another tab left in the cookies', async () => {
		const put = jest.spyOn(invoiceService, 'put').mockResolvedValue({} as never);
		const target = { invoiceId: 'invoice-1', invoiceNumber: 7, email: 'billing@acme.test' };

		await invoiceService.sendInvoiceByEmail(target, listScope);

		const params = { invoiceNumber: 7, invoiceId: 'invoice-1', isEstimate: false, ...listScope };
		expect(put.mock.calls[0][1]).toEqual({ params });
		expect(put.mock.calls[0][2]?.tenantId).toBe('tenant-1');
	});

	it('changes the status and deletes under the tenant of the list', async () => {
		const put = jest.spyOn(invoiceService, 'put').mockResolvedValue({} as never);
		const remove = jest.spyOn(invoiceService, 'delete').mockResolvedValue({} as never);

		await invoiceService.changeInvoiceStatus('invoice-1', VOID_CHANGE, listScope);
		await invoiceService.deleteInvoice('invoice-1', listScope);

		expect(put.mock.calls[0][2]?.tenantId).toBe('tenant-1');
		expect(remove.mock.calls[0][1]?.tenantId).toBe('tenant-1');
	});
});
