/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react';
import type { EntriesPdfContent } from '@/core/components/dashboards/kit/entries-pdf';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import type { CsvColumn } from '@/core/lib/utils/dashboard-export';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { ALL_STATUSES } from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockDownloadCsv = jest.fn();
const mockDownloadPdf = jest.fn();
const mockExportToXLSX = jest.fn();
const mockBuildEntriesPdf = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key}:${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/lib/utils/dashboard-export', () => ({
	...jest.requireActual('@/core/lib/utils/dashboard-export'),
	downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args),
	downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args)
}));
jest.mock('@/core/lib/utils/export-utils', () => ({
	exportToXLSX: (...args: unknown[]) => mockExportToXLSX(...args)
}));
jest.mock('@/core/components/dashboards/kit/entries-pdf', () => ({
	buildEntriesPdf: (content: unknown) => mockBuildEntriesPdf(content)
}));

import { csvOf } from '@/core/lib/utils/dashboard-export';
import { useTimesheetExportOptions } from './timesheets-export';

interface SheetLine {
	cells: Array<string | number>;
	isTotal: boolean;
}

interface SheetColumn {
	header: string;
	value: (line: SheetLine) => string | number;
	format?: string;
}

function logOf(id: string, start: Date, minutes: number, fields: Record<string, unknown> = {}): ITimeLog {
	const end = new Date(start.getTime() + minutes * 60_000);
	return { id, startedAt: start, stoppedAt: end, duration: minutes * 60, ...fields } as unknown as ITimeLog;
}

// Local times, so the days and the clock times read the same whatever the zone the tests run in
const monday = logOf('monday', new Date(2026, 10, 2, 9, 5), 90, {
	employee: { id: 'ada', fullName: 'Ada Lovelace' },
	project: { id: 'website', name: 'Website' },
	task: { id: 't1', title: 'Header' },
	timesheet: { status: ETimesheetStatus.APPROVED },
	isBillable: true
});
const tuesdayLate = logOf('tuesday-late', new Date(2026, 10, 3, 14, 0), 30, {
	employee: { id: 'grace', fullName: 'Grace Hopper' }
});
const tuesdayEarly = logOf('tuesday-early', new Date(2026, 10, 3, 8, 30), 45, {
	employee: { id: 'ada', fullName: 'Ada Lovelace' }
});
const logs = [tuesdayLate, monday, tuesdayEarly];
const period: Period = { from: new Date(2026, 10, 2), to: new Date(2026, 10, 8, 23, 59, 59) };
const TOTAL_SECONDS = 9900;
const SECONDS_PER_DAY = 86400;

function optionsOf(overrides: Partial<Parameters<typeof useTimesheetExportOptions>[0]> = {}) {
	const { result } = renderHook(() =>
		useTimesheetExportOptions({
			logs,
			period,
			appliedFilters: [],
			statusFilter: ALL_STATUSES,
			search: '',
			...overrides
		})
	);
	return result.current;
}

async function runOption(options: ExportOption[], key: string) {
	const option = options.find((candidate) => candidate.key === key);
	await option?.run();
}

async function printedContentOf(options: ExportOption[]): Promise<EntriesPdfContent> {
	await runOption(options, 'pdf');
	return mockBuildEntriesPdf.mock.calls[0][0];
}

describe('the files of the Timesheets page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDownloadPdf.mockImplementation(async (buildDocument: () => Promise<unknown>) => {
			await buildDocument();
		});
	});

	it('offers CSV, XLSX and PDF', () => {
		expect(optionsOf().map((option) => option.key)).toEqual(['csv', 'xlsx', 'pdf']);
	});

	it('writes the CSV as before: one row per log in the order they started', async () => {
		await runOption(optionsOf(), 'csv');

		const [rows, columns, fileName] = mockDownloadCsv.mock.calls[0] as [unknown[], CsvColumn<unknown>[], string];
		expect(fileName).toBe('timesheets-2026-11-02-2026-11-08.csv');
		expect(csvOf(rows, columns).split('\r\n')).toEqual([
			'dashboard.timesheets.COLUMNS.DATE,dashboard.timesheets.COLUMNS.START,dashboard.timesheets.COLUMNS.END,dashboard.timesheets.COLUMNS.MEMBER,dashboard.timesheets.COLUMNS.PROJECT,dashboard.timesheets.COLUMNS.TASK,dashboard.timesheets.COLUMNS.STATUS,dashboard.timesheets.COLUMNS.BILLABLE,dashboard.timesheets.COLUMNS.DURATION,common.NOTES',
			'2026-11-02,09:05,10:35,Ada Lovelace,Website,Header,dashboard.timesheets.STATUS.APPROVED,pages.timesheet.BILLABLE.YES,1:30,',
			'2026-11-03,08:30,09:15,Ada Lovelace,,,,pages.timesheet.BILLABLE.NO,0:45,',
			'2026-11-03,14:00,14:30,Grace Hopper,,,,pages.timesheet.BILLABLE.NO,0:30,'
		]);
	});

	it('writes the same rows to XLSX, the duration as a number, and closes on their total in bold', async () => {
		await runOption(optionsOf(), 'xlsx');

		const [lines, columns, fileName, sheetOptions] = mockExportToXLSX.mock.calls[0] as [
			SheetLine[],
			SheetColumn[],
			string,
			{ isBoldRow: (line: SheetLine) => boolean }
		];
		const cellsOf = (line: SheetLine) => columns.map((column) => column.value(line));
		const durationColumn = columns[columns.length - 2];

		expect(fileName).toBe('timesheets-2026-11-02-2026-11-08.xlsx');
		expect(columns).toHaveLength(10);
		expect(columns[columns.length - 1].header).toBe('common.NOTES');
		expect(durationColumn.format).toBe('[h]:mm');
		expect(lines.map(cellsOf)).toEqual([
			[
				'2026-11-02',
				'09:05',
				'10:35',
				'Ada Lovelace',
				'Website',
				'Header',
				'dashboard.timesheets.STATUS.APPROVED',
				'pages.timesheet.BILLABLE.YES',
				5400 / SECONDS_PER_DAY,
				''
			],
			[
				'2026-11-03',
				'08:30',
				'09:15',
				'Ada Lovelace',
				'',
				'',
				'',
				'pages.timesheet.BILLABLE.NO',
				2700 / SECONDS_PER_DAY,
				''
			],
			[
				'2026-11-03',
				'14:00',
				'14:30',
				'Grace Hopper',
				'',
				'',
				'',
				'pages.timesheet.BILLABLE.NO',
				1800 / SECONDS_PER_DAY,
				''
			],
			['common.TOTAL', '', '', '', '', '', '', '', TOTAL_SECONDS / SECONDS_PER_DAY, '']
		]);
		expect(lines.map(sheetOptions.isBoldRow)).toEqual([false, false, false, true]);
	});

	it('prints the same logs to PDF, grouped by day as the list, with the day totals and the total', async () => {
		const content = await printedContentOf(optionsOf());

		const groups = content.groups.map((group) => [group.key, group.total, group.rows.map((row) => row.key)]);
		expect(groups).toEqual([
			['2026-11-03', '1h 15m', ['tuesday-early', 'tuesday-late']],
			['2026-11-02', '1h 30m', ['monday']]
		]);
		expect(content.total).toEqual({ label: 'common.TOTAL', value: '2h 45m' });
		expect(content.summary).toEqual([
			{ label: 'common.TOTAL', value: '2h 45m' },
			{ label: 'timeReports.timesheetExport.LOGS', value: '3' },
			{ label: 'common.MEMBERS', value: '2' }
		]);
		expect(content.columns).toHaveLength(content.columnWidths.length);
		expect(content.groups[1].rows[0].cells).toEqual([
			'09:05',
			'10:35',
			'Ada Lovelace',
			'Website',
			'Header',
			'dashboard.timesheets.STATUS.APPROVED',
			'pages.timesheet.BILLABLE.YES',
			'1h 30m'
		]);
		expect(mockDownloadPdf.mock.calls[0][1]).toBe('timesheets-2026-11-02-2026-11-08.pdf');
	});

	it('prints what narrowed the logs: the filters gathered per property, the status and the search', async () => {
		const options = optionsOf({
			appliedFilters: [
				{ fieldLabel: 'Client', name: 'Acme' },
				{ fieldLabel: 'Client', name: 'No client' },
				{ fieldLabel: 'Billable', name: 'Billable only' }
			],
			statusFilter: ETimesheetStatus.PENDING,
			search: ' header '
		});

		const content = await printedContentOf(options);

		expect(content.filters?.lines).toEqual([
			{ label: 'Client', value: 'Acme, No client' },
			{ label: 'Billable', value: 'Billable only' },
			{ label: 'common.STATUS', value: 'dashboard.timesheets.STATUS.PENDING' },
			{ label: 'common.SEARCH', value: 'header' }
		]);
	});

	it('prints no filter when nothing narrowed the logs', async () => {
		const content = await printedContentOf(optionsOf());

		expect(content.filters?.lines).toEqual([]);
	});
});
