import { invoicePaperFiguresOf } from './invoice-paper';
import type { TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';

function savedInvoice(parts: Partial<TSavedInvoice>) {
	return { id: 'invoice-7', totalValue: 220, tax: 10, taxType: 'PERCENT', ...parts } as TSavedInvoice;
}

describe('invoicePaperFiguresOf', () => {
	it('leaves the subtotal unknown when the invoice came without its lines', () => {
		const figures = invoicePaperFiguresOf(savedInvoice({ invoiceItems: undefined }));

		expect(figures.subtotal).toBeNull();
		expect(figures.taxBase).toBeNull();
	});

	it('adds up the lines it was given, an empty list making 0', () => {
		expect(invoicePaperFiguresOf(savedInvoice({ invoiceItems: [] })).subtotal).toBe(0);
	});
});
