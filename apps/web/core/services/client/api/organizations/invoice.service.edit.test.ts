import qs from 'qs';
import type { InvoiceUpdate } from '@/core/lib/utils/invoice-edit';
import type { InvoiceItemRequest } from '@/core/lib/utils/invoices';

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
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
});

describe('writing an edit', () => {
	it('puts the invoice’s own fields on the invoice, leaving the object given as it was', async () => {
		const put = jest.spyOn(invoiceService, 'put').mockResolvedValue({ data: {} } as never);

		await invoiceService.updateInvoice('invoice-42', update);

		expect(put).toHaveBeenCalledWith('/invoices/invoice-42', update);
		expect(put.mock.calls[0][1]).not.toBe(update);
	});

	it('posts the lines as the list itself, adding nothing to it', async () => {
		const post = jest.spyOn(invoiceService, 'post').mockResolvedValue({ data: [] } as never);
		const lines = [line] as InvoiceItemRequest[];

		await invoiceService.replaceInvoiceLines('invoice-42', lines);

		expect(post).toHaveBeenCalledWith('/invoice-item/bulk/invoice-42', [line], undefined, false);
	});
});
