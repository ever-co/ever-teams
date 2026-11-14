import { invoiceTotalsOf } from '@/core/lib/utils/invoice-totals';
import type { TSavedInvoice, TSavedInvoiceItem } from '@/core/types/schemas/organization/invoice.schema';

const PERCENT_TYPE = 'PERCENT';

const CENTS_PER_UNIT = 100;

interface PaperLineFigures {
	id: string;
	description: string | null;
	hours: number | null;
	rate: number | null;
	amount: number | null;
}

type PaperAdjustmentKind = 'discount' | 'tax' | 'tax2';

/** A discount or a tax as the invoice states it: a percent, an amount, or a percent with the amount it makes. */
export interface PaperAdjustment {
	kind: PaperAdjustmentKind;
	percent: number | null;
	amount: number | null;
}

export interface InvoicePaperFigures {
	lines: PaperLineFigures[];
	/** The lines added up; null when the invoice came without its lines, or a line states no amount. */
	subtotal: number | null;
	/** What the first tax is taken of: the subtotal less the discount, when both amounts are known. */
	taxBase: number | null;
	adjustments: PaperAdjustment[];
	total: number | null;
}

function isStated(value: number | null | undefined): value is number {
	return typeof value === 'number' && value !== 0;
}

function numberOrNull(value: number | null | undefined) {
	if (typeof value === 'number') {
		return value;
	}
	return null;
}

function lineAmountOf(item: TSavedInvoiceItem) {
	const total = numberOrNull(item.totalValue);
	if (total !== null) {
		return total;
	}
	const hours = numberOrNull(item.quantity);
	const rate = numberOrNull(item.price);
	if (hours === null || rate === null) {
		return null;
	}
	return hours * rate;
}

function lineDescriptionOf(item: TSavedInvoiceItem) {
	const description = item.description?.trim();
	if (description) {
		return description;
	}
	const projectName = item.project?.name?.trim();
	if (projectName) {
		return projectName;
	}
	return null;
}

function lineOf(item: TSavedInvoiceItem): PaperLineFigures {
	const description = lineDescriptionOf(item);
	return {
		id: item.id,
		description,
		hours: numberOrNull(item.quantity),
		rate: numberOrNull(item.price),
		amount: lineAmountOf(item)
	};
}

function sumOf(lines: ReadonlyArray<PaperLineFigures>) {
	let cents = 0;
	for (const line of lines) {
		if (line.amount === null) {
			return null;
		}
		cents += Math.round(line.amount * CENTS_PER_UNIT);
	}
	return cents / CENTS_PER_UNIT;
}

type LineAdjustmentFlag = 'applyDiscount' | 'applyTax';

/** A line saved without the flag takes the adjustment, as the composer saves every line. */
function appliesToEveryLine(items: ReadonlyArray<TSavedInvoiceItem>, flag: LineAdjustmentFlag) {
	return items.every((item) => item[flag] !== false);
}

/** A percent of the subtotal, when it applies to every line: of a part of the lines its amount is left to the total. */
function baseFor(items: ReadonlyArray<TSavedInvoiceItem>, flag: LineAdjustmentFlag, base: number | null) {
	if (!appliesToEveryLine(items, flag)) {
		return null;
	}
	return base;
}

function discountOf(invoice: TSavedInvoice, subtotal: number | null): PaperAdjustment | null {
	const value = invoice.discountValue;
	if (!isStated(value)) {
		return null;
	}
	if (invoice.discountType !== PERCENT_TYPE) {
		return { kind: 'discount', percent: null, amount: value };
	}
	const base = baseFor(invoice.invoiceItems ?? [], 'applyDiscount', subtotal);
	let amount: number | null = null;
	if (base !== null) {
		amount = invoiceTotalsOf(base, { discountPercent: value, taxPercent: null }).discount;
	}
	return { kind: 'discount', percent: value, amount };
}

function taxOf(
	kind: 'tax' | 'tax2',
	value: number | null | undefined,
	type: string | null | undefined,
	base: number | null
): PaperAdjustment | null {
	if (!isStated(value)) {
		return null;
	}
	if (type !== PERCENT_TYPE) {
		return { kind, percent: null, amount: value };
	}
	// How the API combines a second tax with the first is not stated: its amount is left to the total
	const knowsAmount = kind === 'tax' && base !== null;
	let amount: number | null = null;
	if (knowsAmount) {
		amount = invoiceTotalsOf(base, { discountPercent: null, taxPercent: value }).tax;
	}
	return { kind, percent: value, amount };
}

function taxBaseOf(subtotal: number | null, discount: PaperAdjustment | null) {
	if (subtotal === null) {
		return null;
	}
	if (!discount) {
		return subtotal;
	}
	if (discount.amount === null) {
		return null;
	}
	return subtotal - discount.amount;
}

/** An invoice read without its line list has an unknown subtotal; one read with no line adds up to 0. */
function subtotalOf(items: TSavedInvoice['invoiceItems'], lines: ReadonlyArray<PaperLineFigures>) {
	if (!Array.isArray(items)) {
		return null;
	}
	return sumOf(lines);
}

/** The figures an invoice's paper shows, as the API holds them: its total is the one it billed, never recomputed. */
export function invoicePaperFiguresOf(invoice: TSavedInvoice): InvoicePaperFigures {
	const lines = (invoice.invoiceItems ?? []).map(lineOf);
	const subtotal = subtotalOf(invoice.invoiceItems, lines);
	const discount = discountOf(invoice, subtotal);
	const taxBase = taxBaseOf(subtotal, discount);
	const tax = taxOf('tax', invoice.tax, invoice.taxType, baseFor(invoice.invoiceItems ?? [], 'applyTax', taxBase));
	const secondTax = taxOf('tax2', invoice.tax2, invoice.tax2Type, taxBase);
	const adjustments: PaperAdjustment[] = [];
	for (const adjustment of [discount, tax, secondTax]) {
		if (adjustment) {
			adjustments.push(adjustment);
		}
	}
	return { lines, subtotal, taxBase, adjustments, total: numberOrNull(invoice.totalValue) };
}
