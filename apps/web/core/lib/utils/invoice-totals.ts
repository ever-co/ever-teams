/** What an invoice takes off its subtotal and adds to it, in percent; null when the invoice states none. */
export interface InvoiceAdjustments {
	discountPercent: number | null;
	taxPercent: number | null;
}

export const NO_ADJUSTMENTS: InvoiceAdjustments = { discountPercent: null, taxPercent: null };

export interface InvoiceTotals {
	subtotal: number;
	discount: number;
	/** The subtotal less the discount: what the tax is taken of. */
	discounted: number;
	tax: number;
	total: number;
}

const CENTS_PER_UNIT = 100;

const PERCENT_BASE = 100;

const MAX_PERCENT = 100;

/** Up to three digits, then a point or a comma and up to four decimals: 8.875 is a real tax rate. */
const PERCENT_TEXT_PATTERN = /^\d{0,3}(?:[.,]\d{0,4})?$/;

function centsOf(amount: number) {
	return Math.round(amount * CENTS_PER_UNIT);
}

function unitsOf(cents: number) {
	return cents / CENTS_PER_UNIT;
}

function percentOfCents(cents: number, percent: number | null) {
	if (percent === null) {
		return 0;
	}
	const share = (cents * percent) / PERCENT_BASE;
	return Math.round(share);
}

/**
 * The discount is taken off the subtotal and the tax added to what is left, each rounded to the cent: 10 % off
 * 1,000.00 leaves 900.00, and 20 % tax on that makes 1,080.00.
 */
export function invoiceTotalsOf(subtotal: number, adjustments: InvoiceAdjustments): InvoiceTotals {
	const subtotalCents = centsOf(subtotal);
	const discountCents = percentOfCents(subtotalCents, adjustments.discountPercent);
	const discountedCents = subtotalCents - discountCents;
	const taxCents = percentOfCents(discountedCents, adjustments.taxPercent);
	const totalCents = discountedCents + taxCents;
	return {
		subtotal: unitsOf(subtotalCents),
		discount: unitsOf(discountCents),
		discounted: unitsOf(discountedCents),
		tax: unitsOf(taxCents),
		total: unitsOf(totalCents)
	};
}

export function hasAdjustments(adjustments: InvoiceAdjustments) {
	const hasDiscount = adjustments.discountPercent !== null;
	const hasTax = adjustments.taxPercent !== null;
	return hasDiscount || hasTax;
}

function numberOfPercentText(text: string) {
	const normalized = text.trim().replace(',', '.');
	if (!normalized) {
		return Number.NaN;
	}
	return Number(normalized);
}

/** Whether a percent field may hold `text` while it is typed: empty, or on its way to a number from 0 to 100. */
export function acceptsPercentText(text: string) {
	if (!PERCENT_TEXT_PATTERN.test(text)) {
		return false;
	}
	const value = numberOfPercentText(text);
	if (Number.isNaN(value)) {
		return true;
	}
	return value <= MAX_PERCENT;
}

/** The percent a field states; null while it is empty or holds a decimal mark alone. */
export function percentOfText(text: string): number | null {
	const value = numberOfPercentText(text);
	if (!Number.isFinite(value)) {
		return null;
	}
	return value;
}

export function formatPercent(percent: number, locale: string) {
	const format = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 4 });
	return format.format(percent / PERCENT_BASE);
}
