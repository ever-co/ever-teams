import {
	invoiceActionsOf,
	isDraftInvoice,
	isInvoiceRecipient,
	pagesWithInvoiceChanged,
	pagesWithoutInvoice,
	paidChangeOf,
	unpaidChangeOf
} from './invoice-actions';

describe('the actions of an invoice', () => {
	it('sends, settles, voids and deletes a draft', () => {
		expect(invoiceActionsOf('DRAFT')).toEqual(['send', 'markPaid', 'void', 'delete']);
	});

	it('deletes nothing that left the draft state', () => {
		expect(invoiceActionsOf('SENT')).toEqual(['send', 'markPaid', 'void']);
		expect(invoiceActionsOf('VIEWED')).toEqual(['send', 'markPaid', 'void']);
	});

	it('never voids money received, and marks unpaid only what was marked paid', () => {
		expect(invoiceActionsOf('FULLY_PAID')).toEqual(['send', 'markUnpaid']);
		expect(invoiceActionsOf('PARTIALLY_PAID')).toEqual(['send', 'markPaid']);
		expect(invoiceActionsOf('OVERPAID')).toEqual(['send']);
	});

	it('offers nothing on a void invoice, nor on a status it does not know', () => {
		expect(invoiceActionsOf('VOID')).toEqual([]);
		expect(invoiceActionsOf(null)).toEqual([]);
	});

	it('makes a draft Sent when it is sent, and never takes a later status back', () => {
		expect(isDraftInvoice('DRAFT')).toBe(true);
		expect(isDraftInvoice('VIEWED')).toBe(false);
		expect(isDraftInvoice('FULLY_PAID')).toBe(false);
		expect(isDraftInvoice(null)).toBe(false);
	});
});

describe('what each action changes', () => {
	it('marks an invoice paid in full: its total paid, nothing due', () => {
		expect(paidChangeOf(1080)).toEqual({ status: 'FULLY_PAID', paid: true, alreadyPaid: 1080, amountDue: 0 });
	});

	it('marks an invoice unpaid: back to Sent, nothing paid, its total due', () => {
		expect(unpaidChangeOf(1080)).toEqual({ status: 'SENT', paid: false, alreadyPaid: 0, amountDue: 1080 });
	});

	it('writes no amount the invoice does not state', () => {
		expect(paidChangeOf(null)).toEqual({ status: 'FULLY_PAID', paid: true, amountDue: 0 });
		expect(unpaidChangeOf(undefined)).toEqual({ status: 'SENT', paid: false, alreadyPaid: 0 });
	});

	it('takes an e-mail address as the recipient and nothing else', () => {
		expect(isInvoiceRecipient(' billing@acme.test ')).toBe(true);
		expect(isInvoiceRecipient('billing')).toBe(false);
		expect(isInvoiceRecipient('')).toBe(false);
	});
});

describe('the list after an action', () => {
	const pages = [
		{
			items: [
				{ id: 'a', status: 'DRAFT' },
				{ id: 'b', status: 'SENT' }
			],
			total: 3
		},
		{ items: [{ id: 'c', status: 'DRAFT' }], total: 3 }
	];

	it('shows the new status of the invoice that changed, and leaves the others as they were', () => {
		const changed = pagesWithInvoiceChanged(pages, 'c', { status: 'SENT' });

		expect(changed.flatMap((page) => page.items)).toEqual([
			{ id: 'a', status: 'DRAFT' },
			{ id: 'b', status: 'SENT' },
			{ id: 'c', status: 'SENT' }
		]);
	});

	it('takes a deleted invoice out of the list and counts one fewer', () => {
		const remaining = pagesWithoutInvoice(pages, 'a');

		expect(remaining.map((page) => [page.items.map((item) => item.id), page.total])).toEqual([
			[['b'], 2],
			[['c'], 2]
		]);
	});

	it('changes nothing when the deleted invoice is not listed', () => {
		const remaining = pagesWithoutInvoice(pages, 'z');

		expect(remaining).toEqual(pages);
	});
});
