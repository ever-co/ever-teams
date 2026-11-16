import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import type { LinePrice } from '@/core/lib/utils/invoices';
import { type BreakdownFact, type TimeActivityRow, breakdownFactsOf } from '@/core/lib/utils/dashboards/time-activity';

const SECONDS_PER_HOUR = 3600;

const DEFAULT_CURRENCY = 'USD';

// A rate read back from an amount and its time carries a float's last digits: six decimals say it whole
const RATE_KEY_PRECISION = 1e6;

/**
 * The rate an entry states, or its member had, as a key: entries of one task that took the same time are told apart
 * by it. No positive rate is "none"; a rate without a currency of its own is in the default one, as Gauzy counts it.
 */
export function entryRateKeyOf(rate: unknown, currency: string | null | undefined): string {
	const value = Number(rate);
	const isRate = Number.isFinite(value) && value > 0;
	if (!isRate) {
		return 'none';
	}
	const rounded = Math.round(value * RATE_KEY_PRECISION) / RATE_KEY_PRECISION;
	return `${rounded}|${currency || DEFAULT_CURRENCY}`;
}

/** The price of a row's time: its member on its project, through the chain an invoice line prices it with. */
export type PriceOfRow = (row: DailyReportRow) => LinePrice;

/** The project whose client rates price a row: time without a team keeps the project it was logged on. */
export function pricedProjectIdOf(row: Pick<DailyReportRow, 'projectId' | 'loggedProjectId'>): string | null {
	if (row.projectId) {
		return row.projectId;
	}
	return row.loggedProjectId ?? null;
}

/** The projects whose client rates the rows need, each once and in a stable order, so their reads keep their keys. */
export function billableProjectIdsOf(rows: ReadonlyArray<DailyReportRow>): string[] {
	const ids = new Set<string>();
	for (const row of rows) {
		const projectId = pricedProjectIdOf(row);
		if (projectId) {
			ids.add(projectId);
		}
	}
	return [...ids].sort((first, second) => first.localeCompare(second));
}

function amountOf(seconds: number, rate: number | null): number | null {
	if (rate === null) {
		return null;
	}
	return (seconds / SECONDS_PER_HOUR) * rate;
}

/**
 * The facts of the billable time, each priced at its row's rate. They carry no time of their own: added to the facts
 * of all the time, every row of a breakdown gets the amount its billable time bills while its time stays the same.
 */
export function billableFactsOf(rows: ReadonlyArray<TimeActivityRow>, priceOf: PriceOfRow): BreakdownFact[] {
	const facts: BreakdownFact[] = [];
	for (const row of rows) {
		const price = priceOf(row);
		const rateKey = entryRateKeyOf(row.billRateValue, row.billRateCurrency);
		for (const fact of breakdownFactsOf([row])) {
			facts.push({
				...fact,
				seconds: 0,
				activeSeconds: 0,
				trackedSeconds: 0,
				rate: null,
				currency: null,
				billable: {
					seconds: fact.seconds,
					amount: amountOf(fact.seconds, price.rate),
					currency: price.currency,
					rateKey
				}
			});
		}
	}
	return facts;
}
