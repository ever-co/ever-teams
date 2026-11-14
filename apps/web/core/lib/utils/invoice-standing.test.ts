import { invoiceStandingSummaryOf, type StandingInvoice } from './invoice-standing';

const TODAY = '2026-11-14';
const TIME_ZONE = 'UTC';

function owedOf(invoice: StandingInvoice) {
	return invoiceStandingSummaryOf(
		[{ dueDate: '2026-12-01T00:00:00.000Z', currency: 'USD', ...invoice }],
		TODAY,
		TIME_ZONE
	);
}

describe('what is still owed on an invoice', () => {
	it('is its total less what was paid when the API states both, whatever amount due it stores', () => {
		const summary = owedOf({ status: 'SENT', totalValue: 150, alreadyPaid: 0, amountDue: 100 });

		expect(summary.owed).toEqual([{ currency: 'USD', amount: 150, count: 1 }]);
		expect(summary.owedWithoutAmount).toBe(0);
	});

	it('is rounded to the cent', () => {
		const summary = owedOf({ status: 'PARTIALLY_PAID', totalValue: 100.3, alreadyPaid: 40.1 });

		expect(summary.owed).toEqual([{ currency: 'USD', amount: 60.2, count: 1 }]);
	});

	it('is the amount due the API states when what was paid is not stated', () => {
		const summary = owedOf({ status: 'PARTIALLY_PAID', totalValue: 150, amountDue: 90 });

		expect(summary.owed).toEqual([{ currency: 'USD', amount: 90, count: 1 }]);
	});

	it('is the whole total of a sent invoice that states no payment', () => {
		const summary = owedOf({ status: 'SENT', totalValue: 150 });

		expect(summary.owed).toEqual([{ currency: 'USD', amount: 150, count: 1 }]);
	});

	it('is not read for a part-paid invoice that states only its total', () => {
		const summary = owedOf({ status: 'PARTIALLY_PAID', totalValue: 150 });

		expect(summary.owed).toEqual([]);
		expect(summary.owedWithoutAmount).toBe(1);
	});

	it('is nothing on a paid invoice', () => {
		const summary = owedOf({ status: 'FULLY_PAID', totalValue: 150, alreadyPaid: 150, amountDue: 0 });

		expect(summary.owed).toEqual([]);
		expect(summary.paid).toEqual([{ currency: 'USD', amount: 150, count: 1 }]);
	});
});
