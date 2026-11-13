/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import type { TimeActivityFigures } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import type { TimeActivityFilterOptions } from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';
import type { CsvColumn } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	type BreakdownGrouping,
	type ClientOfProjectLog,
	breakdownFactsOf,
	breakdownTreeOf,
	clientOfProjectLogOf,
	clientRowsOf,
	reportTotalsOf
} from '@/core/lib/utils/dashboards/time-activity';
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
	billable: []
};

const FIGURES: TimeActivityFigures = {
	trackedSeconds: 3000,
	reportSeconds: 3000,
	activityPercent: 50,
	totals: reportTotalsOf([])
};

function optionsUnder(grouping: BreakdownGrouping, clientOfProjectLog: ClientOfProjectLog | null) {
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
			filters={{ teamIds: [], employeeIds: [], projectIds: [], taskIds: [], clientIds: [], billable: [] }}
			filterOptions={NO_OPTIONS}
			isDisabled={false}
		/>
	);
	const props = mockExportMenuProps.mock.lastCall?.[0] as { options: ExportOption[] };
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

	it('keeps the exports of the other groupings without a client column', async () => {
		const options = optionsUnder('project', null);

		await run(options, 'csv');

		const { headers } = csvTableOf();
		expect(headers[0]).toBe('common.DATE');
		expect(headers).not.toContain('common.CLIENT');
	});
});
