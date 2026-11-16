import type { CurrencyAmount } from '@/core/lib/utils/daily-report-figures';
import {
	type BreakdownFact,
	type TimeActivityExportRow,
	NO_CLIENT,
	clientLineKeyOf
} from '@/core/lib/utils/dashboards/time-activity';

const CENTS_PER_UNIT = 100;

/** What the billable time of an export row bills: `amount` is in whole cents and null when no rate prices the time. */
export interface ExportRowBillable {
	seconds: number;
	amount: number | null;
	currency: string | null;
}

/** The billable time of each export row that has some: a row missing from it has none. */
export type ExportBillables = ReadonlyMap<TimeActivityExportRow, ExportRowBillable>;

/** What rows bill together, per currency and never added across currencies, and the part no rate prices. */
export interface ExportBillableTotals {
	amounts: CurrencyAmount[];
	seconds: number;
	unpricedSeconds: number;
}

interface PricedEntry {
	seconds: number;
	amount: number | null;
	currency: string | null;
}

function matchKeyOf(parts: ReadonlyArray<string>) {
	return JSON.stringify(parts);
}

/** A row and the billable time of the same entry share the day, the member, the project as listed, client and task. */
function rowMatchKeyOf(row: TimeActivityExportRow) {
	const client = row.client ?? NO_CLIENT;
	return matchKeyOf([row.dateKey, row.employeeId, row.projectKey, client.key, row.taskKey]);
}

function factMatchKeyOf(fact: BreakdownFact) {
	return matchKeyOf([fact.dateKey, fact.employeeId, fact.project.key, fact.client.key, fact.taskKey]);
}

function pricedEntriesByKeyOf(facts: ReadonlyArray<BreakdownFact>) {
	const entries = new Map<string, PricedEntry[]>();
	for (const fact of facts) {
		const billable = fact.billable;
		if (!billable) {
			continue;
		}
		const billsTime = billable.seconds > 0;
		if (!billsTime) {
			continue;
		}
		const key = factMatchKeyOf(fact);
		const entriesOfKey = entries.get(key) ?? [];
		entriesOfKey.push({ seconds: billable.seconds, amount: billable.amount, currency: billable.currency });
		entries.set(key, entriesOfKey);
	}
	return entries;
}

function takeEntryOf(entries: PricedEntry[] | undefined, seconds: number): PricedEntry | null {
	if (!entries) {
		return null;
	}
	const index = entries.findIndex((entry) => entry.seconds === seconds);
	if (index < 0) {
		return null;
	}
	const [entry] = entries.splice(index, 1);
	return entry ?? null;
}

function sumOf(values: ReadonlyArray<number>) {
	let total = 0;
	for (const value of values) {
		total += value;
	}
	return total;
}

function fractionOrder(fractions: ReadonlyArray<number>) {
	const indexes = fractions.map((_fraction, index) => index);
	return indexes.sort((first, second) => {
		const byFraction = fractions[second] - fractions[first];
		if (byFraction !== 0) {
			return byFraction;
		}
		return first - second;
	});
}

/**
 * Each amount in whole cents, the cents adding up to the total rounded to the cent: rounding every row on its own
 * could leave a file a cent or more away from the figure the page shows. The cents left over go to the amounts that
 * lost the most to the rounding down, the earlier one first on a tie.
 */
export function centsAddingUpOf(amounts: ReadonlyArray<number>): number[] {
	const exactCents = amounts.map((amount) => amount * CENTS_PER_UNIT);
	const cents = exactCents.map((exact) => Math.floor(exact));
	const fractions = exactCents.map((exact, index) => exact - cents[index]);
	const totalCents = Math.round(sumOf(exactCents));
	let missingCents = totalCents - sumOf(cents);
	const order = fractionOrder(fractions);
	for (const index of order) {
		if (missingCents <= 0) {
			break;
		}
		cents[index] += 1;
		missingCents -= 1;
	}
	return cents;
}

interface PricedRow {
	row: TimeActivityExportRow;
	entry: PricedEntry;
}

function rowsByCurrencyOf(priced: ReadonlyArray<PricedRow>) {
	const byCurrency = new Map<string, PricedRow[]>();
	for (const pricedRow of priced) {
		const { amount, currency } = pricedRow.entry;
		const isPriced = amount !== null && currency !== null;
		if (!isPriced) {
			continue;
		}
		const rows = byCurrency.get(currency) ?? [];
		rows.push(pricedRow);
		byCurrency.set(currency, rows);
	}
	return byCurrency;
}

function unpricedBillableOf(entry: PricedEntry): ExportRowBillable {
	return { seconds: entry.seconds, amount: null, currency: null };
}

/**
 * The billable time of each export row, priced as the page prices it: the page's facts of the billable time, each
 * placed on the row of the same entry. Gauzy lists one task row per entry, so an entry is found by its day, member,
 * project, client, task and time. Amounts are rounded to the cent so that the rows of a currency add up to its total.
 */
export function exportBillablesOf(
	rows: ReadonlyArray<TimeActivityExportRow>,
	facts: ReadonlyArray<BreakdownFact>
): ExportBillables {
	const entries = pricedEntriesByKeyOf(facts);
	const priced: PricedRow[] = [];
	for (const row of rows) {
		const entry = takeEntryOf(entries.get(rowMatchKeyOf(row)), row.seconds);
		if (entry) {
			priced.push({ row, entry });
		}
	}
	const billables = new Map<TimeActivityExportRow, ExportRowBillable>();
	for (const { row, entry } of priced) {
		billables.set(row, unpricedBillableOf(entry));
	}
	for (const [currency, rowsOfCurrency] of rowsByCurrencyOf(priced)) {
		const amounts = rowsOfCurrency.map(({ entry }) => entry.amount ?? 0);
		const cents = centsAddingUpOf(amounts);
		rowsOfCurrency.forEach(({ row, entry }, index) => {
			const amount = cents[index] / CENTS_PER_UNIT;
			billables.set(row, { seconds: entry.seconds, amount, currency });
		});
	}
	return billables;
}

/** What the rows bill together; the amounts are already in cents, so they add up without drifting. */
export function exportBillableTotalsOf(
	rows: Iterable<TimeActivityExportRow>,
	billables: ExportBillables
): ExportBillableTotals {
	const centsByCurrency = new Map<string, number>();
	let seconds = 0;
	let unpricedSeconds = 0;
	for (const row of rows) {
		const billable = billables.get(row);
		if (!billable) {
			continue;
		}
		seconds += billable.seconds;
		const { amount, currency } = billable;
		const isPriced = amount !== null && currency !== null;
		if (!isPriced) {
			unpricedSeconds += billable.seconds;
			continue;
		}
		const previous = centsByCurrency.get(currency) ?? 0;
		const cents = Math.round(amount * CENTS_PER_UNIT);
		centsByCurrency.set(currency, previous + cents);
	}
	const amounts = [...centsByCurrency.entries()].map(([currency, cents]) => ({
		currency,
		amount: cents / CENTS_PER_UNIT
	}));
	return { amounts, seconds, unpricedSeconds };
}

/** What each line of a client's PDF group bills: the rows of a line add up, as its time does. */
export function clientLineBillablesOf(
	rows: ReadonlyArray<TimeActivityExportRow>,
	billables: ExportBillables
): Map<string, ExportBillableTotals> {
	const rowsByLine = new Map<string, TimeActivityExportRow[]>();
	for (const row of rows) {
		const key = clientLineKeyOf(row);
		const rowsOfLine = rowsByLine.get(key) ?? [];
		rowsOfLine.push(row);
		rowsByLine.set(key, rowsOfLine);
	}
	const totals = new Map<string, ExportBillableTotals>();
	for (const [key, rowsOfLine] of rowsByLine) {
		totals.set(key, exportBillableTotalsOf(rowsOfLine, billables));
	}
	return totals;
}
