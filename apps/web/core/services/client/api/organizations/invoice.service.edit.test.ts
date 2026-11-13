import qs from 'qs';
import type { InvoiceUpdate } from '@/core/lib/utils/invoice-edit';
import type { InvoiceItemRequest } from '@/core/lib/utils/invoices';

const mockCookieScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => mockCookieScope.organizationId,
	getTenantIdCookie: () => mockCookieScope.tenantId
}));

import { invoiceService } from './invoice.service';

const savedInvoice = {
	id: 'invoice-42',
	invoiceNumber: 42,
	status: 'SENT',
	invoiceItems: [{ id: 'item-1', description: 'Ana Lima', price: '80.00', quantity: '10.00', totalValue: '800.00' }]
};

const update = { invoiceNumber: 42, status: 'SENT', totalValue: 1080 } as InvoiceUpdate;

const line = { description: 'Ana Lima', price: 80, quantity: 10, totalValue: 800, invoiceId: 'invoice-42' };

afterEach(() => {
	jest.restoreAllMocks();
	mockCookieScope.organizationId = 'organization-1';
	mockCookieScope.tenantId = 'tenant-1';
});

describe('reading an invoice to edit it', () => {
	it('asks for its lines, their projects and its client, in the tenant the cache key holds', async () => {
		const get = jest.spyOn(invoiceService, 'get').mockResolvedValue({ data: savedInvoice } as never);

		const invoice = await invoiceService.getInvoice('invoice-42', { tenantId: 'tenant-of-the-key' });

		const [url, config] = get.mock.calls[0];
		const [path, query] = String(url).split('?');
		expect(path).toBe('/invoices/invoice-42');
		expect(JSON.parse(String(qs.parse(query).data))).toEqual({
			relations: ['invoiceItems', 'invoiceItems.project', 'toContact']
		});
		expect(config?.tenantId).toBe('tenant-of-the-key');
		expect(invoice.invoiceItems?.[0]).toMatchObject({ price: 80, quantity: 10, totalValue: 800 });
	});

	it('reads it with the token it is given rather than the cookies’ one', async () => {
		const get = jest.spyOn(invoiceService, 'get').mockResolvedValue({ data: savedInvoice } as never);

		await invoiceService.getInvoice('invoice-42', { tenantId: 'tenant-1', accessToken: 'token-1' });

		expect(get.mock.calls[0][1]).toMatchObject({
			tenantId: 'tenant-1',
			pinnedAuthorization: true,
			headers: { Authorization: 'Bearer token-1' }
		});
	});
});

describe('writing an edit', () => {
	it('puts the invoice’s own fields on the invoice, leaving the object given as it was', async () => {
		const put = jest.spyOn(invoiceService, 'put').mockResolvedValue({ data: {} } as never);

		await invoiceService.updateInvoice('invoice-42', update);

		expect(put).toHaveBeenCalledWith('/invoices/invoice-42', update, { tenantId: 'tenant-1' });
		expect(put.mock.calls[0][1]).not.toBe(update);
	});

	it('posts the lines as the list itself, adding nothing to it', async () => {
		const post = jest.spyOn(invoiceService, 'post').mockResolvedValue({ data: [] } as never);
		const lines = [line] as InvoiceItemRequest[];

		await invoiceService.replaceInvoiceLines('invoice-42', lines);

		expect(post).toHaveBeenCalledWith('/invoice-item/bulk/invoice-42', [line], { tenantId: 'tenant-1' }, false);
	});

	it('writes under the tenant of the invoice’s workspace, not the one another tab left in the cookies', async () => {
		const put = jest.spyOn(invoiceService, 'put').mockResolvedValue({ data: {} } as never);
		const post = jest.spyOn(invoiceService, 'post').mockResolvedValue({ data: [] } as never);
		const invoiceWorkspace = { organizationId: 'organization-1', tenantId: 'tenant-1' };
		mockCookieScope.organizationId = 'organization-2';
		mockCookieScope.tenantId = 'tenant-2';

		await invoiceService.updateInvoice('invoice-42', update, invoiceWorkspace);
		await invoiceService.replaceInvoiceLines('invoice-42', [line] as InvoiceItemRequest[], invoiceWorkspace);

		expect(put.mock.calls[0][2]?.tenantId).toBe('tenant-1');
		expect(post.mock.calls[0][2]?.tenantId).toBe('tenant-1');
	});

	it('writes with the token the save began with when it is given, not the one another tab left in the cookies', async () => {
		const put = jest.spyOn(invoiceService, 'put').mockResolvedValue({ data: {} } as never);
		const post = jest.spyOn(invoiceService, 'post').mockResolvedValue({ data: [] } as never);
		const pinned = { organizationId: 'organization-1', tenantId: 'tenant-1', accessToken: 'token-1' };
		const pinnedConfig = {
			tenantId: 'tenant-1',
			pinnedAuthorization: true,
			headers: { Authorization: 'Bearer token-1' }
		};
		mockCookieScope.tenantId = 'tenant-2';

		await invoiceService.updateInvoice('invoice-42', update, pinned);
		await invoiceService.replaceInvoiceLines('invoice-42', [line] as InvoiceItemRequest[], pinned);

		expect(put.mock.calls[0][2]).toMatchObject(pinnedConfig);
		expect(post.mock.calls[0][2]).toMatchObject(pinnedConfig);
	});
});
