import {
	acceptsPercentText,
	formatPercent,
	hasAdjustments,
	invoiceTotalsOf,
	NO_ADJUSTMENTS,
	percentOfText
} from './invoice-totals';

describe('invoiceTotalsOf', () => {
	it('takes a 10 % discount off 1,000.00, then adds a 20 % tax to the 900.00 left: 1,080.00', () => {
		const totals = invoiceTotalsOf(1000, { discountPercent: 10, taxPercent: 20 });

		expect(totals).toEqual({ subtotal: 1000, discount: 100, discounted: 900, tax: 180, total: 1080 });
	});

	it('leaves the subtotal as the total when the invoice states neither', () => {
		expect(invoiceTotalsOf(826.4, NO_ADJUSTMENTS)).toEqual({
			subtotal: 826.4,
			discount: 0,
			discounted: 826.4,
			tax: 0,
			total: 826.4
		});
	});

	it('rounds the discount and then the tax to the cent', () => {
		const totals = invoiceTotalsOf(826.4, { discountPercent: 15, taxPercent: 7.5 });

		expect(totals).toEqual({ subtotal: 826.4, discount: 123.96, discounted: 702.44, tax: 52.68, total: 755.12 });
	});

	it('adds a tax alone to the whole subtotal', () => {
		const totals = invoiceTotalsOf(99.99, { discountPercent: null, taxPercent: 20 });

		expect(totals).toMatchObject({ discount: 0, tax: 20, total: 119.99 });
	});

	it('knows whether an invoice states a discount or a tax', () => {
		expect(hasAdjustments(NO_ADJUSTMENTS)).toBe(false);
		expect(hasAdjustments({ discountPercent: 0, taxPercent: null })).toBe(true);
		expect(hasAdjustments({ discountPercent: null, taxPercent: 20 })).toBe(true);
	});
});

describe('percent fields', () => {
	it('lets a field hold a percent from 0 to 100 while it is typed', () => {
		const accepted = ['', '0', '10', '10.', '10,5', '.5', '8.875', '100'];

		expect(accepted.filter((text) => !acceptsPercentText(text))).toEqual([]);
	});

	it('keeps out anything else', () => {
		const refused = ['100.5', '1000', 'ten', '-5', '1.23456', '10%', ' 10'];

		expect(refused.filter((text) => acceptsPercentText(text))).toEqual([]);
	});

	it('reads the percent a field states, and none while it is empty', () => {
		expect(percentOfText('10,5')).toBe(10.5);
		expect(percentOfText('10.')).toBe(10);
		expect(percentOfText('0')).toBe(0);
		expect(percentOfText('')).toBeNull();
		expect(percentOfText('.')).toBeNull();
	});

	it('writes a percent the way the reader’s language does', () => {
		expect(formatPercent(10, 'en')).toBe('10%');
		expect(formatPercent(8.875, 'en')).toBe('8.875%');
	});
});
