import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import { linePriceOf, type ProjectClientRates } from '@/core/lib/utils/invoices';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { billableFiguresOfFacts, exportRowsOf } from './time-activity';
import { type PriceOfRow, billableFactsOf as pricedFactsOf, pricedProjectIdOf } from './time-activity-billable';
import {
	centsAddingUpOf,
	centsOfAmount,
	clientLineBillablesOf,
	exportBillableTotalsOf,
	exportBillablesOf
} from './time-activity-export-billable';

const HOUR = 3600;

const ana = { id: 'ana', fullName: 'Ana' };
const bo = { id: 'bo', fullName: 'Bo', billRateValue: 60, billRateCurrency: 'EUR' };
const cy = { id: 'cy', fullName: 'Cy' };
const dee = { id: 'dee', fullName: 'Dee', billRateValue: 50, billRateCurrency: 'USD' };

interface Entry {
	task: string;
	seconds: number;
}

function taskOf({ task, seconds }: Entry) {
	return { task: { id: task, title: task }, description: '', duration: seconds };
}

function employeeLogOf(employee: object, entries: Entry[]) {
	const sum = entries.reduce((total, entry) => total + entry.seconds, 0);
	return { employee, sum, activity: 50, tasks: entries.map(taskOf) };
}

function dayOf(date: string, logs: Array<{ project: string; employeeLogs: object[] }>) {
	return {
		date,
		logs: logs.map(({ project, employeeLogs }) => ({ project: { id: project, name: project }, employeeLogs }))
	};
}

const CLIENT_RATES = new Map<string, ProjectClientRates>([
	['website', { billRateValue: 90, currency: 'EUR', members: [] }],
	['thirds', { billRateValue: 100, currency: 'EUR', members: [] }],
	['half-cent', { billRateValue: 2.01, currency: 'EUR', members: [] }]
]);

const priceOf: PriceOfRow = (row) =>
	linePriceOf({
		employeeId: row.employeeId,
		projectRates: CLIENT_RATES.get(pricedProjectIdOf(row) ?? ''),
		projectCurrency: null,
		employeeRate: { billRateValue: row.billRateValue, billRateCurrency: row.billRateCurrency },
		organizationCurrency: 'EUR',
		defaultRate: null
	});

/** The page reads the billable time apart: its facts are priced, as the band's are. */
function factsOf(billableReport: ReadonlyArray<object>) {
	const rows = flattenDailyReport(billableReport as ITimeLogGroupedDailyReport[]);
	return pricedFactsOf(rows, priceOf);
}

function rowsOf(report: ReadonlyArray<object>) {
	return exportRowsOf(report as ITimeLogGroupedDailyReport[], null);
}

// Ana bills 10 h on Website (client rate 90) and logs 1 h there she does not bill; Bo bills 5 h on App at 60
const ANA_BILLED = [
	{ task: 'Home', seconds: 4 * HOUR },
	{ task: 'Home', seconds: 6 * HOUR }
];
const ANA_UNBILLED = { task: 'Home', seconds: HOUR };
const BO_BILLED = [{ task: 'API', seconds: 5 * HOUR }];

const REPORT = [
	dayOf('2026-11-02', [
		{ project: 'website', employeeLogs: [employeeLogOf(ana, [...ANA_BILLED, ANA_UNBILLED])] },
		{ project: 'app', employeeLogs: [employeeLogOf(bo, BO_BILLED)] }
	])
];
const BILLABLE_REPORT = [
	dayOf('2026-11-02', [
		{ project: 'website', employeeLogs: [employeeLogOf(ana, ANA_BILLED)] },
		{ project: 'app', employeeLogs: [employeeLogOf(bo, BO_BILLED)] }
	])
];

describe('billable time of the Time & activity export rows', () => {
	it('prices the rows of 10 h at the client rate of 90 and 5 h at a billing rate of 60 at 1,200, as the band', () => {
		const rows = rowsOf(REPORT);
		const facts = factsOf(BILLABLE_REPORT);

		const billables = exportBillablesOf(rows, facts);

		const totals = exportBillableTotalsOf(rows, billables);
		expect(totals).toEqual({
			amounts: [{ currency: 'EUR', amount: 1200 }],
			seconds: 15 * HOUR,
			unpricedSeconds: 0
		});
		expect(totals.amounts).toEqual(billableFiguresOfFacts(facts).amounts);
	});

	it('puts each billable entry on its own row and leaves the entry Ana did not bill without billable time', () => {
		const rows = rowsOf(REPORT);

		const billables = exportBillablesOf(rows, factsOf(BILLABLE_REPORT));

		const anaRows = rows.filter((row) => row.employeeId === 'ana');
		const cells = anaRows.map((row) => [row.seconds, billables.get(row) ?? null]);
		expect(cells).toEqual([
			[6 * HOUR, { seconds: 6 * HOUR, amount: 540, currency: 'EUR' }],
			[4 * HOUR, { seconds: 4 * HOUR, amount: 360, currency: 'EUR' }],
			[HOUR, null]
		]);
	});

	it('keeps the hours of billable time no rate prices, without an amount', () => {
		const cyLog = employeeLogOf(cy, [{ task: 'Docs', seconds: 2 * HOUR }]);
		const report = [dayOf('2026-11-03', [{ project: 'app', employeeLogs: [cyLog] }])];

		const rows = rowsOf(report);
		const billables = exportBillablesOf(rows, factsOf(report));

		expect(billables.get(rows[0])).toEqual({ seconds: 2 * HOUR, amount: null, currency: null });
		expect(exportBillableTotalsOf(rows, billables)).toEqual({
			amounts: [],
			seconds: 2 * HOUR,
			unpricedSeconds: 2 * HOUR
		});
	});

	it('keeps each currency apart and never adds one to another', () => {
		const deeLog = employeeLogOf(dee, [{ task: 'Support', seconds: HOUR }]);
		const report = [...REPORT, dayOf('2026-11-04', [{ project: 'support', employeeLogs: [deeLog] }])];
		const billableReport = [
			...BILLABLE_REPORT,
			dayOf('2026-11-04', [{ project: 'support', employeeLogs: [deeLog] }])
		];

		const rows = rowsOf(report);
		const totals = exportBillableTotalsOf(rows, exportBillablesOf(rows, factsOf(billableReport)));

		expect(totals.amounts).toEqual([
			{ currency: 'EUR', amount: 1200 },
			{ currency: 'USD', amount: 50 }
		]);
	});

	it('rounds the rows so they add up to the total to the cent', () => {
		const thirds = [1, 2, 3].map((index) => ({ task: `Part ${index}`, seconds: 20 * 60 }));
		const report = [dayOf('2026-11-05', [{ project: 'thirds', employeeLogs: [employeeLogOf(ana, thirds)] }])];

		const rows = rowsOf(report);
		const billables = exportBillablesOf(rows, factsOf(report));

		const amounts = rows.map((row) => billables.get(row)?.amount);
		expect(amounts).toEqual([33.34, 33.33, 33.33]);
		expect(exportBillableTotalsOf(rows, billables).amounts).toEqual([{ currency: 'EUR', amount: 100 }]);
	});

	it('adds up the billable time of the rows of each line of a client PDF group', () => {
		const rows = rowsOf(REPORT);
		const billables = exportBillablesOf(rows, factsOf(BILLABLE_REPORT));

		const lines = [...clientLineBillablesOf(rows, billables).values()];

		const amounts = lines.map((line) => line.amounts);
		expect(amounts).toEqual([[{ currency: 'EUR', amount: 900 }], [{ currency: 'EUR', amount: 300 }]]);
	});

	it('gives no billable time to any row when the page read none', () => {
		const rows = rowsOf(REPORT);

		const billables = exportBillablesOf(rows, []);

		expect(billables.size).toBe(0);
	});
});

describe('billable entries that look alike', () => {
	it('gives equal entries of one task the amount of the rate each one keeps', () => {
		const entryAt = (rate: number) => ({
			...taskOf({ task: 'Home', seconds: HOUR }),
			billRateValue: rate,
			billRateCurrency: 'EUR'
		});
		const log = { employee: ana, sum: 3 * HOUR, activity: 50, tasks: [entryAt(60), entryAt(90), entryAt(60)] };
		const report = [dayOf('2026-11-06', [{ project: 'no-rate', employeeLogs: [log] }])];

		const rows = rowsOf(report);
		const billables = exportBillablesOf(rows, factsOf(report));

		expect(rows.map((row) => billables.get(row)?.amount)).toEqual(rows.map((row) => row.earnings));
		expect(rows.map((row) => row.earnings)).toEqual([60, 90, 60]);
	});

	it('keeps the billable part of a row Gauzy sent without its entries', () => {
		const fullLog = { employee: bo, sum: 3 * HOUR, activity: 50, tasks: [] };
		const billableLog = { employee: bo, sum: 2 * HOUR, activity: 50, tasks: [] };
		const report = [dayOf('2026-11-06', [{ project: 'app', employeeLogs: [fullLog] }])];
		const billableReport = [dayOf('2026-11-06', [{ project: 'app', employeeLogs: [billableLog] }])];

		const rows = rowsOf(report);
		const billables = exportBillablesOf(rows, factsOf(billableReport));

		expect(billables.get(rows[0])).toEqual({ seconds: 2 * HOUR, amount: 120, currency: 'EUR' });
	});

	it('keeps the billable amount of an entry whose time changed between the two reads, as the band does', () => {
		const report = [dayOf('2026-11-06', [{ project: 'app', employeeLogs: [employeeLogOf(bo, BO_BILLED)] }])];
		const reRead = [{ task: 'API', seconds: 5 * HOUR + 60 }];
		const billableReport = [dayOf('2026-11-06', [{ project: 'app', employeeLogs: [employeeLogOf(bo, reRead)] }])];

		const rows = rowsOf(report);
		const facts = factsOf(billableReport);
		const billables = exportBillablesOf(rows, facts);

		expect(billables.get(rows[0])).toEqual({ seconds: 5 * HOUR + 60, amount: 301, currency: 'EUR' });
		expect(exportBillableTotalsOf(rows, billables).amounts).toEqual(billableFiguresOfFacts(facts).amounts);
	});

	it('bills an amount priced without a currency in the default one, as the band adds it', () => {
		const log = employeeLogOf({ id: 'eve', fullName: 'Eve', billRateValue: 40 }, [{ task: 'QA', seconds: HOUR }]);
		const report = [dayOf('2026-11-06', [{ project: 'no-rate', employeeLogs: [log] }])];
		const rows = exportRowsOf(report as ITimeLogGroupedDailyReport[], null);
		const noCurrency: PriceOfRow = () => ({ rate: 40, currency: null, source: 'employee' });
		const facts = pricedFactsOf(flattenDailyReport(report as ITimeLogGroupedDailyReport[]), noCurrency);

		const billables = exportBillablesOf(rows, facts);

		expect(billables.get(rows[0])).toEqual({ seconds: HOUR, amount: 40, currency: 'USD' });
		expect(exportBillableTotalsOf(rows, billables).amounts).toEqual(billableFiguresOfFacts(facts).amounts);
	});

	// Bo's entries of one task on one day at his rate of 60: only the labels, or nothing at all, tell them apart
	function labelledEntryOf(seconds: number, label: string | null) {
		const tags = label ? [{ id: label.toLowerCase(), name: label, color: null }] : [];
		return { ...taskOf({ task: 'API', seconds }), tags };
	}

	function boReportOf(entries: ReadonlyArray<ReturnType<typeof labelledEntryOf>>) {
		const sum = entries.reduce((total, entry) => total + entry.duration, 0);
		const log = { employee: bo, sum, activity: 50, tasks: entries };
		return [dayOf('2026-11-08', [{ project: 'app', employeeLogs: [log] }])];
	}

	it.each([
		['with different labels', 'Design', 'Review'],
		['the first without a label', null, 'Review'],
		['the second without a label', 'Review', null]
	])(
		'of two equal entries %s, bills the billable one and not the one listed first',
		(_case, unbilledLabel, billedLabel) => {
			const unbilled = labelledEntryOf(HOUR, unbilledLabel);
			const billed = labelledEntryOf(HOUR, billedLabel);

			const rows = rowsOf(boReportOf([unbilled, billed]));
			const facts = factsOf(boReportOf([billed]));
			const billables = exportBillablesOf(rows, facts);

			const cells = rows.map((row) => [row.labels, billables.get(row)?.amount ?? null]);
			expect(cells).toEqual([
				[unbilledLabel ?? '', null],
				[billedLabel ?? '', 60]
			]);
			expect(exportBillableTotalsOf(rows, billables).amounts).toEqual(billableFiguresOfFacts(facts).amounts);
		}
	);

	it('keeps an entry whose time changed between the two reads on the row of its own label', () => {
		const unbilled = labelledEntryOf(HOUR, 'Design');
		const billed = labelledEntryOf(HOUR + HOUR / 2, 'Review');
		const reRead = labelledEntryOf(HOUR + 60, 'Review');

		const rows = rowsOf(boReportOf([unbilled, billed]));
		const billables = exportBillablesOf(rows, factsOf(boReportOf([reRead])));

		const cells = rows.map((row) => [row.labels, billables.get(row) ?? null]);
		expect(cells).toEqual([
			['Review', { seconds: HOUR + 60, amount: 61, currency: 'EUR' }],
			['Design', null]
		]);
	});

	it('bills one of two entries that differ only by the billable flag, and the file reads the same either way', () => {
		const unbilled = labelledEntryOf(HOUR, 'Review');
		const billed = labelledEntryOf(HOUR, 'Review');

		const rows = rowsOf(boReportOf([unbilled, billed]));
		const facts = factsOf(boReportOf([billed]));
		const billables = exportBillablesOf(rows, facts);

		// The rows write the same cells: which of them carries the amount cannot be seen in the file
		expect(rows[0]).toEqual(rows[1]);
		const amounts = rows.map((row) => billables.get(row)?.amount ?? null);
		expect(amounts.filter((amount) => amount !== null)).toEqual([60]);
		expect(exportBillableTotalsOf(rows, billables).amounts).toEqual(billableFiguresOfFacts(facts).amounts);
	});

	it('rounds a half cent as the page writes the amount', () => {
		const log = employeeLogOf(ana, [{ task: 'Review', seconds: HOUR / 2 }]);
		const report = [dayOf('2026-11-07', [{ project: 'half-cent', employeeLogs: [log] }])];

		const rows = rowsOf(report);
		const billables = exportBillablesOf(rows, factsOf(report));

		expect(billables.get(rows[0])?.amount).toBe(1.01);
		expect(exportBillableTotalsOf(rows, billables).amounts).toEqual([{ currency: 'EUR', amount: 1.01 }]);
	});
});

describe('cents of a currency', () => {
	it('reads an amount in cents the way the page writes it', () => {
		expect(centsOfAmount(1.005)).toBe(101);
	});

	it('gives each amount its whole cents and the leftover cents to the amounts rounded down the most', () => {
		expect(centsAddingUpOf([10.005, 10.005, 10.004])).toEqual([1001, 1000, 1000]);
	});
});
