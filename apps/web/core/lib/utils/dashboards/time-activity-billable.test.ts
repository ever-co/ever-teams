import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { linePriceOf, type ProjectClientRates } from '@/core/lib/utils/invoices';
import type { DefaultBillRate } from '@/core/lib/utils/rates';
import { breakdownFactsOf, breakdownTreeOf } from './time-activity';
import {
	billableFactsOf,
	billableProjectIdsOf,
	keptPriceOfRow,
	pricedProjectIdOf,
	type PriceOfRow
} from './time-activity-billable';

const HOUR = 3600;

function rowOf(extra: Partial<DailyReportRow>): DailyReportRow {
	return {
		key: `${extra.dateKey ?? '2026-11-02'}:${extra.projectId ?? 'none'}:${extra.employeeId ?? 'ana'}`,
		dateKey: '2026-11-02',
		employeeId: 'ana',
		employeeName: 'Ana',
		employeeImageUrl: null,
		billRateValue: null,
		billRateCurrency: 'EUR',
		projectId: 'website',
		projectName: 'Website',
		projectImageUrl: null,
		projectColor: null,
		seconds: HOUR,
		activeSeconds: 0,
		tasks: [],
		...extra
	};
}

const CLIENT_RATES = new Map<string, ProjectClientRates>([
	['website', { billRateValue: 90, currency: 'EUR', members: [] }],
	['app', { billRateValue: null, currency: 'EUR', members: [] }]
]);

function priceOfWith(defaultRate: DefaultBillRate | null): PriceOfRow {
	return (row) =>
		linePriceOf({
			employeeId: row.employeeId,
			projectRates: CLIENT_RATES.get(pricedProjectIdOf(row) ?? ''),
			projectCurrency: null,
			employeeRate: { billRateValue: row.billRateValue, billRateCurrency: row.billRateCurrency },
			organizationCurrency: 'EUR',
			defaultRate
		});
}

// Ana bills 10 h on Website, which has a client rate of 90; Bo bills 5 h on App at his own billing rate of 60
const ACCEPTANCE_ROWS = [
	rowOf({ employeeId: 'ana', projectId: 'website', seconds: 10 * HOUR }),
	rowOf({
		employeeId: 'bo',
		employeeName: 'Bo',
		projectId: 'app',
		projectName: 'App',
		billRateValue: 60,
		seconds: 5 * HOUR
	})
];

// Cy has no rate anywhere: 2 h on App
const UNRATED_ROW = rowOf({
	employeeId: 'cy',
	employeeName: 'Cy',
	projectId: 'app',
	projectName: 'App',
	seconds: 2 * HOUR
});

function totalsOf(rows: DailyReportRow[], priceOf: PriceOfRow) {
	const facts = [...breakdownFactsOf(rows), ...billableFactsOf(rows, priceOf)];
	return breakdownTreeOf(facts, 'project').totals;
}

describe('billable amounts of Time & activity', () => {
	it('bills 10 h at the client rate of 90 and 5 h at a billing rate of 60 as 1,200, as an invoice draft does', () => {
		const totals = totalsOf(ACCEPTANCE_ROWS, priceOfWith(null));

		expect(totals.billable).toEqual({
			amounts: [{ currency: 'EUR', amount: 1200 }],
			seconds: 15 * HOUR,
			unpricedSeconds: 0
		});
	});

	it('prices 2 h of a member without any rate at a default of 80, and counts them apart without one', () => {
		const rows = [...ACCEPTANCE_ROWS, UNRATED_ROW];

		const withDefault = totalsOf(rows, priceOfWith({ value: 80, currency: 'EUR' }));
		const withoutDefault = totalsOf(rows, priceOfWith(null));

		expect(withDefault.billable.amounts).toEqual([{ currency: 'EUR', amount: 1360 }]);
		expect(withDefault.billable.unpricedSeconds).toBe(0);
		expect(withoutDefault.billable.amounts).toEqual([{ currency: 'EUR', amount: 1200 }]);
		expect(withoutDefault.billable.unpricedSeconds).toBe(2 * HOUR);
	});

	it('shows time priced in EUR and in USD as two amounts, never one sum', () => {
		const dollarRow = rowOf({
			employeeId: 'di',
			projectId: null,
			billRateValue: 50,
			billRateCurrency: 'USD',
			seconds: HOUR
		});

		const totals = totalsOf([...ACCEPTANCE_ROWS, dollarRow], priceOfWith(null));

		expect(totals.billable.amounts).toEqual([
			{ currency: 'EUR', amount: 1200 },
			{ currency: 'USD', amount: 50 }
		]);
	});

	it('gives every row of a breakdown its own amount, and leaves its time as it was', () => {
		const facts = [...breakdownFactsOf(ACCEPTANCE_ROWS), ...billableFactsOf(ACCEPTANCE_ROWS, priceOfWith(null))];

		const tree = breakdownTreeOf(facts, 'member');
		const ana = tree.nodes.find((node) => node.key === 'member/ana');
		const bo = tree.nodes.find((node) => node.key === 'member/bo');

		expect(ana?.seconds).toBe(10 * HOUR);
		expect(ana?.billable.amounts).toEqual([{ currency: 'EUR', amount: 900 }]);
		expect(bo?.billable.amounts).toEqual([{ currency: 'EUR', amount: 300 }]);
		expect(tree.totals.seconds).toBe(15 * HOUR);
	});

	it('bills only the billable time a row holds, beside all the time it shows', () => {
		const allTime = [rowOf({ seconds: 4 * HOUR })];
		const billableTime = [rowOf({ seconds: HOUR })];

		const facts = [...breakdownFactsOf(allTime), ...billableFactsOf(billableTime, priceOfWith(null))];
		const totals = breakdownTreeOf(facts, 'project').totals;

		expect(totals.seconds).toBe(4 * HOUR);
		expect(totals.billable).toEqual({
			amounts: [{ currency: 'EUR', amount: 90 }],
			seconds: HOUR,
			unpricedSeconds: 0
		});
	});
});

describe('pricedProjectIdOf and billableProjectIdsOf', () => {
	it('prices time without a team by the project it was logged on, and lists each project once', () => {
		const withoutTeam = rowOf({ projectId: null, loggedProjectId: 'app', isWithoutTeam: true });

		expect(pricedProjectIdOf(withoutTeam)).toBe('app');
		expect(billableProjectIdsOf([withoutTeam, ...ACCEPTANCE_ROWS, rowOf({ projectId: null })])).toEqual([
			'app',
			'website'
		]);
	});
});

describe('a row priced at the client rates its entries kept (CORE-29)', () => {
	const today = { rate: 110, currency: 'EUR', source: 'project' as const };

	it("bills the client rate the entries kept, not today's, beside today's for the note", () => {
		const row = rowOf({
			billRateValue: 50,
			keptClientRates: { projectBillRateValue: 90, projectBillRateCurrency: 'EUR' }
		});

		expect(keptPriceOfRow(row, today, 'EUR', null)).toEqual({
			rate: 90,
			currency: 'EUR',
			source: 'project',
			today
		});
	});

	it("bills a row of a report that states no client rate at today's rate, as before", () => {
		expect(keptPriceOfRow(rowOf({ billRateValue: 50 }), today, 'EUR', null)).toBe(today);
	});
});
