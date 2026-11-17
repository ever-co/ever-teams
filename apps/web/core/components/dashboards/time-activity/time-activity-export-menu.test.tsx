/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import type {
	TimeActivityBillable,
	TimeActivityFigures
} from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import type { TimeActivityFilterOptions } from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';
import type { CsvColumn } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { flattenDailyReport } from '@/core/lib/utils/daily-report-figures';
import type { DurationRoundingRule } from '@/core/lib/utils/duration-rounding';
import {
	type BreakdownGrouping,
	type ClientOfProjectLog,
	billableFiguresOfFacts,
	breakdownFactsOf,
	breakdownTreeOf,
	clientOfProjectLogOf,
	clientRowsOf,
	reportTotalsOf
} from '@/core/lib/utils/dashboards/time-activity';
import {
	type PriceOfRow,
	billableFactsOf as pricedFactsOf,
	pricedProjectIdOf
} from '@/core/lib/utils/dashboards/time-activity-billable';
import { linePriceOf, type ProjectClientRates } from '@/core/lib/utils/invoices';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { PdfGroup, TimeActivityPdfContent } from './time-activity-report-pdf';

const mockDownloadCsv = jest.fn();
const mockDownloadPdf = jest.fn();
const mockExportToXLSX = jest.fn();
const mockBuildPdf = jest.fn();
const mockExportMenuProps = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/lib/utils/dashboard-export', () => ({
	...jest.requireActual('@/core/lib/utils/dashboard-export'),
	downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args),
	downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args)
}));
jest.mock('@/core/lib/utils/export-utils', () => ({
	exportToXLSX: (...args: unknown[]) => mockExportToXLSX(...args)
}));
jest.mock('./time-activity-report-pdf', () => ({
	buildTimeActivityPdf: (content: unknown) => mockBuildPdf(content)
}));
jest.mock('@/core/components/dashboards/kit/export-menu', () => ({
	ExportMenu: (props: { options: ExportOption[] }) => {
		mockExportMenuProps(props);
		return null;
	}
}));

import { TimeActivityExportMenu } from './time-activity-export-menu';

interface SheetColumn {
	header: string;
	value: (row: unknown) => string | number;
}

const ada = { id: 'ada', fullName: 'Ada Lovelace', billRateValue: 60, billRateCurrency: 'USD' };
const grace = { id: 'grace', fullName: 'Grace Hopper' };

const taskOf = (title: string, duration: number) => ({ task: { id: title, title }, description: '', duration });

/** Acme holds the website; Globex, archived, still holds the legacy site; the internal project has no client. */
const REPORT = [
	{
		date: '2026-11-03',
		logs: [
			{
				project: { id: 'website', name: 'Website' },
				employeeLogs: [{ employee: ada, sum: 600, activity: 50, tasks: [taskOf('Home', 600)] }]
			},
			{
				project: { id: 'internal', name: 'Internal' },
				employeeLogs: [{ employee: ada, sum: 300, activity: 0, tasks: [] }]
			}
		]
	},
	{
		date: '2026-11-04',
		logs: [
			{
				project: { id: 'website', name: 'Website' },
				employeeLogs: [{ employee: ada, sum: 1200, activity: 100, tasks: [taskOf('Home', 1200)] }]
			},
			{
				project: { id: 'legacy', name: 'Legacy' },
				employeeLogs: [{ employee: grace, sum: 900, activity: 20, tasks: [taskOf('Fix', 900)] }]
			}
		]
	}
] as unknown as ITimeLogGroupedDailyReport[];

const CLIENT_IDS = new Map<string, string | null>([
	['website', 'acme'],
	['internal', null],
	['legacy', 'globex']
]);

const CLIENT_NAMES = new Map([
	['acme', 'Acme'],
	['globex', 'Globex']
]);

const clientOf: ClientOfProjectLog = clientOfProjectLogOf(CLIENT_IDS, CLIENT_NAMES);

const period: Period = { from: new Date(2026, 10, 2), to: new Date(2026, 10, 8, 23, 59, 59) };

const NO_OPTIONS: TimeActivityFilterOptions = {
	teamIds: [],
	employeeIds: [],
	projectIds: [],
	taskIds: [],
	clientIds: [],
	billable: [],
	entryLabels: []
};

const FIGURES: TimeActivityFigures = {
	trackedSeconds: 3000,
	reportSeconds: 3000,
	activityPercent: 50,
	totals: reportTotalsOf([])
};

function optionsUnder(
	grouping: BreakdownGrouping,
	clientOfProjectLog: ClientOfProjectLog | null,
	roundingRule: DurationRoundingRule | null = null
) {
	mockExportMenuProps.mockClear();
	render(
		<TimeActivityExportMenu
			report={REPORT}
			period={period}
			grouping={grouping}
			clientOf={clientOfProjectLog}
			isManager
			ownEmployeeId="ada"
			figures={FIGURES}
			filters={{
				teamIds: [],
				employeeIds: [],
				projectIds: [],
				taskIds: [],
				clientIds: [],
				billable: [],
				entryLabels: []
			}}
			filterOptions={NO_OPTIONS}
			roundingRule={roundingRule}
			isDisabled={false}
		/>
	);
	const lastCall = mockExportMenuProps.mock.lastCall;
	if (!lastCall) {
		throw new Error('The export menu was never rendered');
	}
	const [props] = lastCall as [{ options: ExportOption[] }];
	return props.options;
}

async function run(options: ExportOption[], key: string) {
	const option = options.find((candidate) => candidate.key === key);
	await option?.run();
}

function csvTableOf() {
	const [rows, columns] = mockDownloadCsv.mock.lastCall as [unknown[], CsvColumn<unknown>[]];
	const headers = columns.map((column) => column.header);
	const lines = rows.map((row) => columns.map((column) => column.valueOf(row)));
	return { headers, lines };
}

function sheetTableOf() {
	const [rows, columns] = mockExportToXLSX.mock.lastCall as [unknown[], SheetColumn[]];
	const headers = columns.map((column) => column.header);
	const lines = rows.map((row) => columns.map((column) => column.value(row)));
	return { headers, lines };
}

async function pdfContentOf() {
	const [buildDocument] = mockDownloadPdf.mock.lastCall as [() => Promise<unknown>];
	await buildDocument();
	return mockBuildPdf.mock.lastCall?.[0] as TimeActivityPdfContent;
}

function screenGroups() {
	const rows = clientRowsOf(REPORT, clientOf, 'dashboard.NO_TEAM_GROUP');
	const tree = breakdownTreeOf(breakdownFactsOf(rows), 'client');
	return tree.nodes.map((node) => formatDurationShort(node.seconds));
}

describe('Time & Activity exports grouped by client', () => {
	beforeEach(() => {
		mockDownloadCsv.mockClear();
		mockDownloadPdf.mockClear();
		mockExportToXLSX.mockClear();
		mockBuildPdf.mockClear();
	});

	it('writes a CSV whose first column is the client, the rows client after client as on screen', async () => {
		await run(optionsUnder('client', clientOf), 'csv');

		const { headers, lines } = csvTableOf();
		expect(headers.slice(0, 5)).toEqual([
			'common.CLIENT',
			'common.DATE',
			'common.MEMBER',
			'dashboard.timeActivity.grouping.PROJECT',
			'dashboard.timeActivity.export.TASK'
		]);
		const firstCells = lines.map((line) => line.slice(0, 5));
		expect(firstCells).toEqual([
			['Acme', '2026-11-03', 'Ada Lovelace', 'Website', 'Home'],
			['Acme', '2026-11-04', 'Ada Lovelace', 'Website', 'Home'],
			['Globex', '2026-11-04', 'Grace Hopper', 'Legacy', 'Fix'],
			['common.NO_CLIENT', '2026-11-03', 'Ada Lovelace', 'Internal', 'dashboard.timeActivity.export.NO_TASK']
		]);
	});

	it('writes the same client column and rows in the Excel file', async () => {
		await run(optionsUnder('client', clientOf), 'xlsx');

		const { headers, lines } = sheetTableOf();
		expect(headers[0]).toBe('common.CLIENT');
		const clients = lines.map((line) => line[0]);
		expect(clients).toEqual(['Acme', 'Acme', 'Globex', 'common.NO_CLIENT']);
	});

	it('prints the client groups of the screen in its order, with its totals, and adds up their days', async () => {
		await run(optionsUnder('client', clientOf), 'pdf');

		const content = await pdfContentOf();
		expect(content.columns.first).toBe('dashboard.timeActivity.grouping.PROJECT');
		expect(content.columns.second).toBe('common.MEMBER');
		const groups = content.groups.map((group: PdfGroup) => [group.title, group.tracked]);
		expect(groups.map((group) => group[1])).toEqual(screenGroups());
		expect(groups.map((group) => group[0])).toEqual(['Acme', 'Globex', 'common.NO_CLIENT']);
		const acmeRows = content.groups[0].rows.map((row) => [row.first, row.second, row.task, row.tracked]);
		expect(acmeRows).toEqual([['Website', 'Ada Lovelace', 'Home', formatDurationShort(1800)]]);
	});

	it('says under the date of the PDF that each entry is rounded, with the rule', async () => {
		await run(optionsUnder('client', clientOf, { intervalMinutes: 15, direction: 'UP' }), 'pdf');

		const content = await pdfContentOf();
		expect(content.generatedOn).toBe(
			'dashboard.timeActivity.export.GENERATED_ON · dashboard.timeActivity.sheet.ROUNDED_UP'
		);
	});

	it('keeps the exports of the other groupings without a client column', async () => {
		const options = optionsUnder('project', null);

		await run(options, 'csv');

		const { headers } = csvTableOf();
		expect(headers[0]).toBe('common.DATE');
		expect(headers).not.toContain('common.CLIENT');
	});
});

const HOUR = 3600;

const billedTaskOf = (title: string, duration: number) => ({ task: { id: title, title }, description: '', duration });

function billedLogOf(employee: object, tasks: ReadonlyArray<{ title: string; seconds: number }>) {
	const sum = tasks.reduce((total, task) => total + task.seconds, 0);
	return { employee, sum, activity: 40, tasks: tasks.map((task) => billedTaskOf(task.title, task.seconds)) };
}

const ana = { id: 'ana', fullName: 'Ana' };
const bo = { id: 'bo', fullName: 'Bo', billRateValue: 60, billRateCurrency: 'EUR' };
const cy = { id: 'cy', fullName: 'Cy' };
const dee = { id: 'dee', fullName: 'Dee', billRateValue: 50, billRateCurrency: 'USD' };

const ANA_BILLED = [
	{ title: 'Home', seconds: 4 * HOUR },
	{ title: 'Home', seconds: 6 * HOUR }
];
const BO_BILLED = [{ title: 'API', seconds: 5 * HOUR }];
const CY_BILLED = [{ title: 'Docs', seconds: 2 * HOUR }];
const DEE_BILLED = [{ title: 'Support', seconds: HOUR }];

/** One day: Ana bills 10 h on Website and logs 1 h there she does not bill, Bo bills 5 h on App, Cy 2 h unrated. */
function billingReportOf(withUnbilled: boolean, withDollars: boolean) {
	const anaTasks = [...ANA_BILLED];
	if (withUnbilled) {
		anaTasks.push({ title: 'Home', seconds: HOUR });
	}
	const logs = [
		{ project: { id: 'website', name: 'Website' }, employeeLogs: [billedLogOf(ana, anaTasks)] },
		{ project: { id: 'app', name: 'App' }, employeeLogs: [billedLogOf(bo, BO_BILLED), billedLogOf(cy, CY_BILLED)] }
	];
	if (withDollars) {
		logs.push({ project: { id: 'support', name: 'Support' }, employeeLogs: [billedLogOf(dee, DEE_BILLED)] });
	}
	return [{ date: '2026-11-03', logs }] as unknown as ITimeLogGroupedDailyReport[];
}

const WEBSITE_RATES = new Map<string, ProjectClientRates>([
	['website', { billRateValue: 90, currency: 'EUR', members: [] }]
]);

const priceOfRow: PriceOfRow = (row) =>
	linePriceOf({
		employeeId: row.employeeId,
		projectRates: WEBSITE_RATES.get(pricedProjectIdOf(row) ?? ''),
		projectCurrency: null,
		employeeRate: { billRateValue: row.billRateValue, billRateCurrency: row.billRateCurrency },
		organizationCurrency: 'EUR',
		defaultRate: null
	});

/** The page names each row's client when it groups by client, the billable rows as the others. */
function billableRowsOf(withDollars: boolean, clientOfLog: ClientOfProjectLog | null) {
	const report = billingReportOf(false, withDollars);
	if (clientOfLog) {
		return clientRowsOf(report, clientOfLog, null);
	}
	return flattenDailyReport(report);
}

/** What the page holds for a reader who may read client rates: the billable time read apart, priced. */
function billableOf(
	withDollars: boolean,
	overrides: Partial<TimeActivityBillable> = {},
	clientOfLog: ClientOfProjectLog | null = null
): TimeActivityBillable {
	const billableRows = billableRowsOf(withDollars, clientOfLog);
	const facts = pricedFactsOf(billableRows, priceOfRow);
	return {
		isOffered: true,
		facts,
		figures: billableFiguresOfFacts(facts),
		isPending: false,
		isError: false,
		canSetDefaultRate: false,
		refetch: () => undefined,
		...overrides
	};
}

function billingOptions(billable: TimeActivityBillable | null, withDollars = false, figures = FIGURES) {
	mockExportMenuProps.mockClear();
	render(
		<TimeActivityExportMenu
			report={billingReportOf(true, withDollars)}
			period={period}
			grouping="project"
			clientOf={null}
			isManager
			ownEmployeeId="ana"
			figures={figures}
			filters={{
				teamIds: [],
				employeeIds: [],
				projectIds: [],
				taskIds: [],
				clientIds: [],
				billable: [],
				entryLabels: []
			}}
			filterOptions={NO_OPTIONS}
			billable={billable}
			isDisabled={false}
		/>
	);
	const [props] = mockExportMenuProps.mock.lastCall as [{ options: ExportOption[]; isDisabled?: boolean }];
	return props;
}

interface Table {
	headers: string[];
	lines: unknown[][];
}

function cellsOf(table: Table, header: string) {
	const index = table.headers.indexOf(header);
	return table.lines.map((line) => line[index]);
}

function amountsByCurrencyOf(table: Table) {
	const amounts = cellsOf(table, 'dashboard.timeActivity.columns.BILLABLE');
	const currencies = cellsOf(table, 'dashboard.timeActivity.export.BILLABLE_CURRENCY');
	const totals = new Map<unknown, number>();
	amounts.forEach((amount, index) => {
		if (typeof amount !== 'number') {
			return;
		}
		const currency = currencies[index];
		const previous = totals.get(currency) ?? 0;
		totals.set(currency, previous + amount);
	});
	return totals;
}

describe('billable amounts in the Time & activity spreadsheets', () => {
	beforeEach(() => {
		mockDownloadCsv.mockClear();
		mockExportToXLSX.mockClear();
	});

	it('adds the billable hours, amount and currency after Earnings in the Excel file', async () => {
		await run(billingOptions(billableOf(false)).options, 'xlsx');

		const { headers } = sheetTableOf();
		expect(headers.slice(-6)).toEqual([
			'dashboard.timeActivity.columns.EARNINGS',
			'dashboard.timeActivity.export.CURRENCY',
			'dashboard.timeActivity.export.BILLABLE_HOURS',
			'dashboard.timeActivity.columns.BILLABLE',
			'dashboard.timeActivity.export.BILLABLE_CURRENCY',
			'dashboard.timeActivity.columns.ACTIVITY'
		]);
	});

	it('prices 10 h at the client rate of 90 and 5 h at a billing rate of 60 so the rows add up to 1,200 EUR', async () => {
		await run(billingOptions(billableOf(false)).options, 'xlsx');

		const totals = amountsByCurrencyOf(sheetTableOf());
		expect([...totals.entries()]).toEqual([['EUR', 1200]]);
	});

	it('keeps 2 h of billable time no rate prices, without an amount, and says so in its currency', async () => {
		await run(billingOptions(billableOf(false)).options, 'csv');

		const table = csvTableOf();
		const cyIndex = cellsOf(table, 'common.MEMBER').indexOf('Cy');
		const cyCells = [
			cellsOf(table, 'dashboard.timeActivity.export.BILLABLE_HOURS')[cyIndex],
			cellsOf(table, 'dashboard.timeActivity.columns.BILLABLE')[cyIndex],
			cellsOf(table, 'dashboard.timeActivity.export.BILLABLE_CURRENCY')[cyIndex]
		];
		expect(cyCells).toEqual([2, null, 'dashboard.timeActivity.export.NO_RATE']);
	});

	it('leaves the hour Ana did not bill without billable time', async () => {
		await run(billingOptions(billableOf(false)).options, 'csv');

		const table = csvTableOf();
		const members = cellsOf(table, 'common.MEMBER');
		const hours = cellsOf(table, 'dashboard.timeActivity.export.BILLABLE_HOURS');
		const anaHours = hours.filter((_hour, index) => members[index] === 'Ana');
		expect(anaHours).toEqual([6, 4, 0]);
	});

	it('writes the same file as today for a reader the page shows no billable amount', async () => {
		await run(billingOptions(null).options, 'csv');
		const today = csvTableOf();

		await run(billingOptions(billableOf(false, { isOffered: false })).options, 'csv');

		expect(csvTableOf()).toEqual(today);
		expect(today.headers).not.toContain('dashboard.timeActivity.export.BILLABLE_HOURS');
	});

	it('waits for the billable amounts before it offers a file', () => {
		const props = billingOptions(billableOf(false, { isPending: true }));

		expect(props.isDisabled).toBe(true);
	});

	it('leaves the billable columns out when the page could not read the amounts', async () => {
		await run(billingOptions(billableOf(false, { isError: true })).options, 'xlsx');

		expect(sheetTableOf().headers).not.toContain('dashboard.timeActivity.columns.BILLABLE');
	});
});

function billableFigureOf(content: TimeActivityPdfContent) {
	return content.summary.find((figure) => figure.label === 'dashboard.timeActivity.columns.BILLABLE');
}

describe('billable amounts in the Time & activity PDF', () => {
	beforeEach(() => {
		mockDownloadPdf.mockClear();
		mockBuildPdf.mockClear();
	});

	it('writes 1,200 EUR and 50 USD on two lines of its summary, and the billable time no rate prices', async () => {
		await run(billingOptions(billableOf(true), true).options, 'pdf');

		const figure = billableFigureOf(await pdfContentOf());
		expect(figure?.value).toMatch(/1,200\.00/);
		expect(figure?.value).toMatch(/€|EUR/);
		expect(figure?.lines).toHaveLength(1);
		expect(figure?.lines?.[0]).toMatch(/\$50\.00|USD/);
		expect(figure?.note).toBe('dashboard.timeActivity.export.BILLABLE_UNPRICED');
	});

	it('gives each table the billable amount column, as on screen', async () => {
		await run(billingOptions(billableOf(false)).options, 'pdf');

		const content = await pdfContentOf();
		expect(content.showsBillable).toBe(true);
		expect(content.columns.billable).toBe('dashboard.timeActivity.columns.BILLABLE');
		const groups = content.groups.map((group) => [group.title, group.billable]);
		expect(groups).toEqual([
			['Website', expect.stringMatching(/900\.00/)],
			['App', expect.stringMatching(/300\.00/)]
		]);
		const appRows = content.groups[1].rows.map((row) => [row.second, row.billable]);
		expect(appRows).toEqual([
			['Bo', expect.stringMatching(/300\.00/)],
			['Cy', 'dashboard.timeActivity.export.NO_RATE']
		]);
	});

	it('adds up the billable time of each line of a client group', async () => {
		const acmeOf = clientOfProjectLogOf(new Map([['website', 'acme']]), new Map([['acme', 'Acme']]));
		mockExportMenuProps.mockClear();
		render(
			<TimeActivityExportMenu
				report={billingReportOf(true, false)}
				period={period}
				grouping="client"
				clientOf={acmeOf}
				isManager
				ownEmployeeId="ana"
				figures={FIGURES}
				filters={{
					teamIds: [],
					employeeIds: [],
					projectIds: [],
					taskIds: [],
					clientIds: [],
					billable: [],
					entryLabels: []
				}}
				filterOptions={NO_OPTIONS}
				billable={billableOf(false, {}, acmeOf)}
				isDisabled={false}
			/>
		);
		const [props] = mockExportMenuProps.mock.lastCall as [{ options: ExportOption[] }];

		await run(props.options, 'pdf');

		const acme = (await pdfContentOf()).groups.find((group) => group.title === 'Acme');
		expect(acme?.billable).toMatch(/900\.00/);
		expect(acme?.rows.map((row) => row.billable)).toEqual([expect.stringMatching(/900\.00/)]);
	});

	it('writes the earnings beside it one currency per line too, so the narrower figure never breaks mid-amount', async () => {
		const earnings = [
			{ currency: 'EUR', amount: 597 },
			{ currency: 'USD', amount: 50 }
		];
		const figures = { ...FIGURES, totals: { ...FIGURES.totals, earnings } };

		await run(billingOptions(billableOf(true), true, figures).options, 'pdf');

		const summary = (await pdfContentOf()).summary;
		const earningsFigure = summary.find((figure) => figure.label === 'dashboard.timeActivity.figures.EARNINGS');
		expect(earningsFigure?.value).toMatch(/597\.00/);
		expect(earningsFigure?.value).not.toMatch(/50\.00/);
		expect(earningsFigure?.lines).toEqual([expect.stringMatching(/50\.00/)]);
	});

	it('keeps the earnings on one line in a file without billable amounts, as today', async () => {
		const earnings = [
			{ currency: 'EUR', amount: 597 },
			{ currency: 'USD', amount: 50 }
		];
		const figures = { ...FIGURES, totals: { ...FIGURES.totals, earnings } };

		await run(billingOptions(null, true, figures).options, 'pdf');

		const summary = (await pdfContentOf()).summary;
		const earningsFigure = summary.find((figure) => figure.label === 'dashboard.timeActivity.figures.EARNINGS');
		expect(earningsFigure?.value).toMatch(/597\.00.*50\.00/);
		expect(earningsFigure?.lines).toBeUndefined();
	});

	it('prints no billable column for a reader the page shows no billable amount', async () => {
		await run(billingOptions(null).options, 'pdf');

		const content = await pdfContentOf();
		expect(content.showsBillable).toBe(false);
		expect(billableFigureOf(content)).toBeUndefined();
	});
});
