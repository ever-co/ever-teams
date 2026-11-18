import type { CurrencyAmount } from '@/core/lib/utils/daily-report-figures';
import {
	type BreakdownFact,
	type TimeActivityExportRow,
	NO_CLIENT,
	NO_TASK_KEY,
	billableFiguresOfFacts,
	clientLineKeyOf
} from '@/core/lib/utils/dashboards/time-activity';
import { entryRateKeyOf } from '@/core/lib/utils/dashboards/time-activity-billable';
import { labelNamesOf } from '@/core/lib/utils/time-log-labels';

const CENTS_PER_UNIT = 100;

const SECONDS_PER_HOUR = 3600;

// An amount priced without a currency of its own is added to the page's total in this one (`billableFiguresOfFacts`)
const DEFAULT_CURRENCY = 'USD';

/** Rounds as the page writes an amount: to the cent, half away from zero, on the amount's decimal value. */
const CENTS_FORMAT = new Intl.NumberFormat('en-US', {
	useGrouping: false,
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

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
	rateKey: string | undefined;
}

function matchKeyOf(parts: ReadonlyArray<string>) {
	return JSON.stringify(parts);
}

/**
 * A row and the billable time of the same entry share the day, the member, the project as listed, client, task and the
 * entry's own labels. The daily report names no entry, so these are what tell its rows apart: two entries of one task
 * that differ only by their labels each find their own row, and the file bills the label the entry carries.
 */
function rowMatchKeyOf(row: TimeActivityExportRow) {
	const client = row.client ?? NO_CLIENT;
	return matchKeyOf([row.dateKey, row.employeeId, row.projectKey, client.key, row.taskKey, row.labels]);
}

// The labels as the row writes them: both come from the same entry's labels, sorted by name (`entryLabelsOf`)
function factMatchKeyOf(fact: BreakdownFact) {
	const labels = labelNamesOf(fact.labels);
	return matchKeyOf([fact.dateKey, fact.employeeId, fact.project.key, fact.client.key, fact.taskKey, labels]);
}

/** The rate a row's earnings were priced at, read back from them: the same entry's billable time states it too. */
function rowRateKeyOf(row: TimeActivityExportRow) {
	const hasTime = row.seconds > 0;
	if (row.earnings === null || !hasTime) {
		return entryRateKeyOf(null, null);
	}
	const rate = (row.earnings * SECONDS_PER_HOUR) / row.seconds;
	return entryRateKeyOf(rate, row.currency);
}

/** The currency of a priced amount as the page counts it: one priced without a currency is in the default one. */
function pricedCurrencyOf(amount: number | null, currency: string | null) {
	if (amount === null) {
		return currency;
	}
	return currency ?? DEFAULT_CURRENCY;
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
		entriesOfKey.push({
			seconds: billable.seconds,
			amount: billable.amount,
			currency: pricedCurrencyOf(billable.amount, billable.currency),
			rateKey: billable.rateKey
		});
		entries.set(key, entriesOfKey);
	}
	return entries;
}

function takeEntryWhere(entries: PricedEntry[] | undefined, matches: (entry: PricedEntry) => boolean) {
	if (!entries) {
		return null;
	}
	const index = entries.findIndex(matches);
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

/** An amount in whole cents, rounded as the page writes it: 1.005 is 1.01 there, so it is 101 cents here. */
export function centsOfAmount(amount: number) {
	const written = Number(CENTS_FORMAT.format(amount));
	return Math.round(written * CENTS_PER_UNIT);
}

/**
 * Each amount in whole cents, the cents adding up to `totalCents`, the total as the page writes it: rounding every row
 * on its own could leave a file a cent or more away from that figure. The cents left over go to the amounts that lost
 * the most to the rounding down, the earlier one first on a tie.
 */
export function centsAddingUpOf(amounts: ReadonlyArray<number>, totalCents = centsOfAmount(sumOf(amounts))): number[] {
	const exactCents = amounts.map((amount) => amount * CENTS_PER_UNIT);
	const cents = exactCents.map((exact) => Math.floor(exact));
	const fractions = exactCents.map((exact, index) => exact - cents[index]);
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

function isAggregateRow(row: TimeActivityExportRow) {
	return row.taskKey === NO_TASK_KEY;
}

function timeGapOf(row: TimeActivityExportRow, entry: PricedEntry) {
	return Math.abs(row.seconds - entry.seconds);
}

/** The free row of the entry's rate whose time is nearest the entry's, the earlier one on a tie; -1 when none. */
function nearestRowIndexOf(freeRows: ReadonlyArray<TimeActivityExportRow>, entry: PricedEntry) {
	let nearest = -1;
	freeRows.forEach((row, index) => {
		if (rowRateKeyOf(row) !== entry.rateKey) {
			return;
		}
		const isNearer = nearest < 0 || timeGapOf(row, entry) < timeGapOf(freeRows[nearest], entry);
		if (isNearer) {
			nearest = index;
		}
	});
	return nearest;
}

/**
 * An entry whose time the two reads of the page tell apart (it was changed between them, or a running timer was
 * re-read) found no row of its time. It goes to the free row of the same identity and rate whose time is nearest, so
 * the file still bills what the band bills rather than silently less.
 */
function placeEntriesOfChangedTime(
	rows: ReadonlyArray<TimeActivityExportRow>,
	entries: ReadonlyMap<string, PricedEntry[]>,
	placed: Map<TimeActivityExportRow, PricedEntry>
) {
	const freeRowsByKey = new Map<string, TimeActivityExportRow[]>();
	for (const row of rows) {
		if (placed.has(row)) {
			continue;
		}
		const key = rowMatchKeyOf(row);
		const freeRows = freeRowsByKey.get(key) ?? [];
		freeRows.push(row);
		freeRowsByKey.set(key, freeRows);
	}
	for (const [key, entriesOfKey] of entries) {
		const freeRows = freeRowsByKey.get(key) ?? [];
		for (const entry of [...entriesOfKey]) {
			const index = nearestRowIndexOf(freeRows, entry);
			if (index < 0) {
				continue;
			}
			const [row] = freeRows.splice(index, 1);
			placed.set(row, entry);
			entriesOfKey.splice(entriesOfKey.indexOf(entry), 1);
		}
	}
}

/**
 * The entries placed on rows, in three passes so that one entry never takes another's place:
 * - the entry of the same identity, time and rate (equal entries of one task at different rates keep their own);
 * - then the same identity and time, when the rate cannot be read back the same way on both sides;
 * - then a row Gauzy sent without its entries, which gathers the time of all of them: its billable part is shorter.
 * Last, an entry whose time changed between the two reads goes to the nearest row of its identity and rate.
 */
function placedEntriesOf(rows: ReadonlyArray<TimeActivityExportRow>, facts: ReadonlyArray<BreakdownFact>) {
	const entries = pricedEntriesByKeyOf(facts);
	const placed = new Map<TimeActivityExportRow, PricedEntry>();
	const passes: Array<(row: TimeActivityExportRow, entry: PricedEntry) => boolean> = [
		(row, entry) => entry.seconds === row.seconds && entry.rateKey === rowRateKeyOf(row),
		(row, entry) => entry.seconds === row.seconds,
		(row, entry) => isAggregateRow(row) && entry.seconds <= row.seconds
	];
	for (const fits of passes) {
		for (const row of rows) {
			if (placed.has(row)) {
				continue;
			}
			const entry = takeEntryWhere(entries.get(rowMatchKeyOf(row)), (candidate) => fits(row, candidate));
			if (entry) {
				placed.set(row, entry);
			}
		}
	}
	placeEntriesOfChangedTime(rows, entries, placed);
	const leftCurrencies = new Set<string | null>();
	for (const entriesOfKey of entries.values()) {
		for (const entry of entriesOfKey) {
			leftCurrencies.add(entry.currency);
		}
	}
	return { placed, leftCurrencies };
}

/**
 * The total of a currency as the page writes it, when every entry of that currency found its row: the page adds the
 * entries in its own order, and a float sum in another order can land on the other side of a half cent. An entry left
 * without a row (the two reads of the page disagree) leaves the rows their own total.
 */
function totalCentsOf(
	currency: string,
	rowsOfCurrency: ReadonlyArray<PricedRow>,
	facts: ReadonlyArray<BreakdownFact>,
	leftCurrencies: ReadonlySet<string | null>
) {
	const rowAmounts = rowsOfCurrency.map(({ entry }) => entry.amount ?? 0);
	const rowCents = centsOfAmount(sumOf(rowAmounts));
	if (leftCurrencies.has(currency)) {
		return rowCents;
	}
	const pageAmounts = billableFiguresOfFacts(facts).amounts;
	const pageAmount = pageAmounts.find((amount) => amount.currency === currency);
	if (!pageAmount) {
		return rowCents;
	}
	return centsOfAmount(pageAmount.amount);
}

/**
 * The billable time of each export row, priced as the page prices it: the page's facts of the billable time, each
 * placed on the row of the same entry. Gauzy lists one task row per entry, so an entry is found by its day, member,
 * project, client, task, labels, time and rate. The amounts of a currency are rounded to the cent so that the rows add up to
 * the total the page writes.
 */
export function exportBillablesOf(
	rows: ReadonlyArray<TimeActivityExportRow>,
	facts: ReadonlyArray<BreakdownFact>
): ExportBillables {
	const { placed, leftCurrencies } = placedEntriesOf(rows, facts);
	const priced: PricedRow[] = [];
	for (const row of rows) {
		const entry = placed.get(row);
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
		const totalCents = totalCentsOf(currency, rowsOfCurrency, facts, leftCurrencies);
		const cents = centsAddingUpOf(amounts, totalCents);
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
