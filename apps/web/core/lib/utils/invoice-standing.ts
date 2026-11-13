import { differenceInCalendarDays } from 'date-fns';
import { dateOfDayKey } from '@/core/lib/utils/dashboards/payments-due';
import { invoiceDayOf, invoiceStatusOf, type InvoiceStatus } from '@/core/lib/utils/invoices';

/**
 * Where an invoice stands for the people who bill: still a draft, owed (open), owed past its due day (overdue), paid,
 * or void. An invoice whose status the app does not know has no standing and is left out of every count.
 */
export type InvoiceStanding = 'draft' | 'open' | 'overdue' | 'paid' | 'void';

export const INVOICE_STANDINGS: ReadonlyArray<InvoiceStanding> = ['draft', 'open', 'overdue', 'paid', 'void'];

const OWED_STATUSES: ReadonlySet<InvoiceStatus> = new Set<InvoiceStatus>(['SENT', 'VIEWED', 'PARTIALLY_PAID']);

const PAID_STATUSES: ReadonlySet<InvoiceStatus> = new Set<InvoiceStatus>(['FULLY_PAID', 'OVERPAID']);

export interface StandingInvoice {
	status?: string | null;
	dueDate?: string | null;
	invoiceDate?: string | null;
	currency?: string | null;
	totalValue?: number | null;
	alreadyPaid?: number | null;
	amountDue?: number | null;
}

export function isOwedStatus(status: InvoiceStatus | null) {
	if (!status) {
		return false;
	}
	return OWED_STATUSES.has(status);
}

/** The day an invoice is due in the organization's zone; null when it states none. */
export function dueDayOf(invoice: Pick<StandingInvoice, 'dueDate'>, timeZone: string | null | undefined) {
	return invoiceDayOf(invoice.dueDate, timeZone);
}

/** Owed and its due day is behind today: day keys compare as text. */
function isPastDue(dueDay: string | null, todayKey: string) {
	if (!dueDay) {
		return false;
	}
	return dueDay < todayKey;
}

export function invoiceStandingOf(
	invoice: Pick<StandingInvoice, 'status' | 'dueDate'>,
	todayKey: string,
	timeZone: string | null | undefined
): InvoiceStanding | null {
	const status = invoiceStatusOf(invoice.status);
	if (!status) {
		return null;
	}
	if (status === 'DRAFT') {
		return 'draft';
	}
	if (status === 'VOID') {
		return 'void';
	}
	if (PAID_STATUSES.has(status)) {
		return 'paid';
	}
	const dueDay = dueDayOf(invoice, timeZone);
	if (isPastDue(dueDay, todayKey)) {
		return 'overdue';
	}
	return 'open';
}

/**
 * Whole days between today and the due day: positive while it is ahead, negative once it is behind (days late), zero
 * on the day. Null when either day is not a real day.
 */
export function daysUntilDue(dueDay: string | null, todayKey: string): number | null {
	if (!dueDay) {
		return null;
	}
	const due = dateOfDayKey(dueDay);
	const today = dateOfDayKey(todayKey);
	if (!due || !today) {
		return null;
	}
	return differenceInCalendarDays(due, today);
}

function amountOf(value: number | null | undefined): number | null {
	if (typeof value !== 'number') {
		return null;
	}
	if (!Number.isFinite(value)) {
		return null;
	}
	return value;
}

/** Cents are kept as the API states them, so a sum never drifts by a fraction of a cent. */
function roundedToCents(amount: number) {
	return Math.round(amount * 100) / 100;
}

/**
 * What is still owed on an invoice: the amount the API says is due, else its total less what was paid on it. A part
 * payment the API did not state cannot be read, so its invoice has no amount owed (null) rather than its whole total.
 */
export function owedAmountOf(invoice: StandingInvoice): number | null {
	const status = invoiceStatusOf(invoice.status);
	if (!isOwedStatus(status)) {
		return null;
	}
	const amountDue = amountOf(invoice.amountDue);
	if (amountDue !== null) {
		return amountDue;
	}
	const total = amountOf(invoice.totalValue);
	if (total === null) {
		return null;
	}
	const alreadyPaid = amountOf(invoice.alreadyPaid);
	if (alreadyPaid !== null) {
		const left = total - alreadyPaid;
		return roundedToCents(left);
	}
	const isPartlyPaid = status === 'PARTIALLY_PAID';
	if (isPartlyPaid) {
		return null;
	}
	return total;
}

export interface CurrencyAmount {
	/** The currency code as the invoices state it; null for invoices that state none. */
	currency: string | null;
	amount: number;
	count: number;
}

export interface InvoiceStandingSummary {
	counts: Record<InvoiceStanding, number>;
	/** Still owed, overdue included, per currency, largest first. */
	owed: CurrencyAmount[];
	overdue: CurrencyAmount[];
	paid: CurrencyAmount[];
	/** Every invoice the client was sent, paid or not: drafts and void invoices are left out. */
	billed: CurrencyAmount[];
	/** Owed invoices whose remaining amount the API did not state (a part payment without its amounts). */
	owedWithoutAmount: number;
	/** The latest day an invoice was issued on, drafts included. */
	lastIssuedDay: string | null;
}

function emptyCounts(): Record<InvoiceStanding, number> {
	return { draft: 0, open: 0, overdue: 0, paid: 0, void: 0 };
}

function currencyKeyOf(currency: string | null | undefined) {
	const code = currency?.trim();
	if (!code) {
		return null;
	}
	return code.toUpperCase();
}

class CurrencySums {
	private readonly byCurrency = new Map<string, CurrencyAmount>();

	add(currency: string | null | undefined, amount: number) {
		const code = currencyKeyOf(currency);
		const key = code ?? '';
		const current = this.byCurrency.get(key) ?? { currency: code, amount: 0, count: 0 };
		const sum = current.amount + amount;
		current.amount = roundedToCents(sum);
		current.count += 1;
		this.byCurrency.set(key, current);
	}

	list(): CurrencyAmount[] {
		const sums = [...this.byCurrency.values()];
		return sums.sort((first, second) => second.amount - first.amount);
	}
}

function laterDay(current: string | null, candidate: string | null) {
	if (!candidate) {
		return current;
	}
	if (!current) {
		return candidate;
	}
	if (candidate > current) {
		return candidate;
	}
	return current;
}

function isBilled(standing: InvoiceStanding) {
	const isDraft = standing === 'draft';
	const isVoid = standing === 'void';
	return !isDraft && !isVoid;
}

/** The figures of a set of invoices (a client's, a workspace's), from what the API returned and nothing else. */
export function invoiceStandingSummaryOf(
	invoices: ReadonlyArray<StandingInvoice>,
	todayKey: string,
	timeZone: string | null | undefined
): InvoiceStandingSummary {
	const counts = emptyCounts();
	const owed = new CurrencySums();
	const overdue = new CurrencySums();
	const paid = new CurrencySums();
	const billed = new CurrencySums();
	let owedWithoutAmount = 0;
	let lastIssuedDay: string | null = null;

	for (const invoice of invoices) {
		const standing = invoiceStandingOf(invoice, todayKey, timeZone);
		if (!standing) {
			continue;
		}
		counts[standing] += 1;
		const issuedDay = invoiceDayOf(invoice.invoiceDate, timeZone);
		lastIssuedDay = laterDay(lastIssuedDay, issuedDay);
		const total = amountOf(invoice.totalValue);
		const hasTotal = total !== null;
		if (hasTotal && isBilled(standing)) {
			billed.add(invoice.currency, total);
		}
		if (hasTotal && standing === 'paid') {
			paid.add(invoice.currency, total);
		}
		const isOwed = standing === 'open' || standing === 'overdue';
		if (!isOwed) {
			continue;
		}
		const owedAmount = owedAmountOf(invoice);
		if (owedAmount === null) {
			owedWithoutAmount += 1;
			continue;
		}
		owed.add(invoice.currency, owedAmount);
		if (standing === 'overdue') {
			overdue.add(invoice.currency, owedAmount);
		}
	}

	return {
		counts,
		owed: owed.list(),
		overdue: overdue.list(),
		paid: paid.list(),
		billed: billed.list(),
		owedWithoutAmount,
		lastIssuedDay
	};
}
