'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type {
	EntriesPdfContent,
	EntriesPdfFigure,
	EntriesPdfGroup
} from '@/core/components/dashboards/kit/entries-pdf';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { FilePdf, FileSheet, FileText } from '@/core/components/icons';
import { APP_NAME } from '@/core/constants/config/constants';
import {
	type CsvColumn,
	downloadCsv,
	downloadPdf,
	pdfTextOf,
	periodFileNameOf
} from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import {
	type TimesheetExportDay,
	type TimesheetExportRow,
	timesheetExportDaysOf,
	timesheetExportRowsOf,
	timesheetExportTotalsOf
} from '@/core/lib/utils/dashboards/timesheet-export';
import { ALL_STATUSES, hoursMinutesOf, type TimesheetStatusFilter } from '@/core/lib/utils/dashboards/timesheets';
import { exportToXLSX } from '@/core/lib/utils/export-utils';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { STATUS_LABEL_KEYS } from './timesheet-status';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'timesheets';

const SECONDS_PER_DAY = 86400;

/** Hours past 24 stay hours in a spreadsheet, so a column of durations can be added up. */
const SHEET_DURATION_FORMAT = '[h]:mm';

const SHEET_DURATION_WIDTH = 12;

const SHEET_NOTES_WIDTH = 48;

/** Start, end, member, project, task, status, billable, duration: the widths of the printed columns, in that order. */
const PDF_COLUMN_WIDTHS = ['6%', '6%', '16%', '16%', '32%', '10%', '7%', '7%'];

const VALUE_SEPARATOR = ', ';

function statusLabelOf(row: TimesheetExportRow, t: Translate) {
	if (!row.status) {
		return '';
	}
	return t(STATUS_LABEL_KEYS[row.status]);
}

function billableLabelOf(row: TimesheetExportRow, t: Translate) {
	if (row.isBillable) {
		return t('pages.timesheet.BILLABLE.YES');
	}
	return t('pages.timesheet.BILLABLE.NO');
}

interface TextColumn {
	header: string;
	text: (row: TimesheetExportRow) => string;
	sheetWidth: number;
}

function dayColumnOf(t: Translate): TextColumn {
	return { header: t('dashboard.timesheets.COLUMNS.DATE'), text: (row) => row.dayKey, sheetWidth: 12 };
}

function entryColumnsOf(t: Translate): TextColumn[] {
	return [
		{ header: t('dashboard.timesheets.COLUMNS.START'), text: (row) => row.start, sheetWidth: 8 },
		{ header: t('dashboard.timesheets.COLUMNS.END'), text: (row) => row.end, sheetWidth: 8 },
		{ header: t('dashboard.timesheets.COLUMNS.MEMBER'), text: (row) => row.member, sheetWidth: 24 },
		{ header: t('dashboard.timesheets.COLUMNS.PROJECT'), text: (row) => row.project, sheetWidth: 24 },
		{ header: t('dashboard.timesheets.COLUMNS.TASK'), text: (row) => row.task, sheetWidth: 40 },
		{ header: t('dashboard.timesheets.COLUMNS.STATUS'), text: (row) => statusLabelOf(row, t), sheetWidth: 14 },
		{ header: t('dashboard.timesheets.COLUMNS.BILLABLE'), text: (row) => billableLabelOf(row, t), sheetWidth: 10 }
	];
}

interface TimesheetExportFilter {
	fieldLabel: string;
	name: string;
}

interface ExportInput {
	logs: ReadonlyArray<ITimeLog>;
	period: Period;
	appliedFilters: ReadonlyArray<TimesheetExportFilter>;
	statusFilter: TimesheetStatusFilter;
	search: string;
	locale: string;
	t: Translate;
}

/**
 * The logs on screen as a CSV file, one row per log in the order they started: local day, start and end in 24-hour
 * time, member, project, task, status, billable, the duration as `h:mm` and the notes.
 */
function runCsv({ logs, period, t }: ExportInput) {
	const textColumns = [dayColumnOf(t), ...entryColumnsOf(t)];
	const columns: CsvColumn<TimesheetExportRow>[] = textColumns.map((column) => ({
		header: column.header,
		valueOf: column.text
	}));
	columns.push({
		header: t('dashboard.timesheets.COLUMNS.DURATION'),
		valueOf: (row) => hoursMinutesOf(row.seconds)
	});
	columns.push({ header: t('common.NOTES'), valueOf: (row) => row.notes });
	const rows = timesheetExportRowsOf(logs);
	const fileName = periodFileNameOf(FILE_PREFIX, period.from, period.to, 'csv');
	downloadCsv(rows, columns, fileName);
}

interface SheetLine {
	cells: Array<string | number>;
	isTotal: boolean;
}

function sheetDurationOf(seconds: number) {
	return seconds / SECONDS_PER_DAY;
}

async function runXlsx({ logs, period, t }: ExportInput) {
	const textColumns = [dayColumnOf(t), ...entryColumnsOf(t)];
	const rows = timesheetExportRowsOf(logs);
	const lines: SheetLine[] = rows.map((row) => {
		const texts = textColumns.map((column) => column.text(row));
		return { cells: [...texts, sheetDurationOf(row.seconds), row.notes], isTotal: false };
	});
	const totals = timesheetExportTotalsOf(logs);
	const totalTexts = textColumns.map(() => '');
	totalTexts[0] = t('common.TOTAL');
	lines.push({ cells: [...totalTexts, sheetDurationOf(totals.seconds), ''], isTotal: true });

	const columns = textColumns.map((column, index) => ({
		header: column.header,
		value: (line: SheetLine) => line.cells[index],
		width: column.sheetWidth
	}));
	const durationIndex = textColumns.length;
	const durationColumn = {
		header: t('dashboard.timesheets.COLUMNS.DURATION'),
		value: (line: SheetLine) => line.cells[durationIndex],
		width: SHEET_DURATION_WIDTH,
		format: SHEET_DURATION_FORMAT
	};
	const notesColumn = {
		header: t('common.NOTES'),
		value: (line: SheetLine) => line.cells[durationIndex + 1],
		width: SHEET_NOTES_WIDTH
	};
	const fileName = periodFileNameOf(FILE_PREFIX, period.from, period.to, 'xlsx');
	await exportToXLSX(lines, [...columns, durationColumn, notesColumn], fileName, {
		isBoldRow: (line) => line.isTotal
	});
}

function filterLinesOf({ appliedFilters, statusFilter, search, t }: ExportInput): EntriesPdfFigure[] {
	const namesByLabel = new Map<string, string[]>();
	for (const filter of appliedFilters) {
		const names = namesByLabel.get(filter.fieldLabel) ?? [];
		names.push(filter.name);
		namesByLabel.set(filter.fieldLabel, names);
	}
	const lines: EntriesPdfFigure[] = [];
	for (const [label, names] of namesByLabel) {
		lines.push({ label, value: names.join(VALUE_SEPARATOR) });
	}
	if (statusFilter !== ALL_STATUSES) {
		lines.push({ label: t('common.STATUS'), value: t(STATUS_LABEL_KEYS[statusFilter]) });
	}
	const searched = search.trim();
	if (searched) {
		lines.push({ label: t('common.SEARCH'), value: searched });
	}
	return lines;
}

function pdfGroupOf(
	day: TimesheetExportDay,
	columns: ReadonlyArray<TextColumn>,
	dayFormat: Intl.DateTimeFormat
): EntriesPdfGroup {
	return {
		key: day.key,
		title: pdfTextOf(dayFormat.format(day.date)),
		total: formatDurationShort(day.seconds),
		rows: day.rows.map((row) => {
			const texts = columns.map((column) => column.text(row));
			return { key: row.id, cells: [...texts, formatDurationShort(row.seconds)] };
		})
	};
}

function pdfContentOf(input: ExportInput): EntriesPdfContent {
	const { logs, period, locale, t } = input;
	const title = t('dashboard.timesheets.TITLE');
	const columns = entryColumnsOf(t);
	const headers = columns.map((column) => column.header);
	const totals = timesheetExportTotalsOf(logs);
	const totalText = formatDurationShort(totals.seconds);
	const dayFormat = new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
	const generatedFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long' });
	const generatedDate = generatedFormat.format(new Date());
	const days = timesheetExportDaysOf(logs);
	return {
		title,
		period: pdfTextOf(formatPeriod(period, locale)),
		generatedOn: pdfTextOf(t('dashboard.timeActivity.export.GENERATED_ON', { date: generatedDate })),
		filters: { title: t('dashboard.timeActivity.export.FILTERS'), lines: filterLinesOf(input) },
		summary: [
			{ label: t('common.TOTAL'), value: totalText },
			{ label: t('timeReports.timesheetExport.LOGS'), value: String(totals.logCount) },
			{ label: t('common.MEMBERS'), value: String(totals.memberCount) }
		],
		columns: [...headers, t('dashboard.timesheets.COLUMNS.DURATION')],
		columnWidths: PDF_COLUMN_WIDTHS,
		groups: days.map((day) => pdfGroupOf(day, columns, dayFormat)),
		total: { label: t('common.TOTAL'), value: totalText },
		footer: `${APP_NAME} · ${title}`,
		pageLabel: (page, total) => t('dashboard.timeActivity.export.PAGE', { page, total })
	};
}

async function runPdf(input: ExportInput) {
	const content = pdfContentOf(input);
	const fileName = periodFileNameOf(FILE_PREFIX, input.period.from, input.period.to, 'pdf');
	await downloadPdf(async () => {
		const { buildEntriesPdf } = await import('@/core/components/dashboards/kit/entries-pdf');
		return buildEntriesPdf(content);
	}, fileName);
}

/**
 * Each file holds exactly the logs on screen, whatever narrowed them (the filter menu, the status cards, the
 * search), and the XLSX and the PDF close on their total. Built on the click only.
 */
export function useTimesheetExportOptions({
	logs,
	period,
	appliedFilters,
	statusFilter,
	search
}: Readonly<Omit<ExportInput, 'locale' | 't'>>): ExportOption[] {
	const t = useTranslations();
	const locale = useLocale();
	return useMemo(() => {
		const input: ExportInput = { logs, period, appliedFilters, statusFilter, search, locale, t };
		return [
			{
				key: 'csv',
				label: t('dashboard.timesheets.EXPORT_CSV'),
				icon: <FileText />,
				run: () => runCsv(input)
			},
			{
				key: 'xlsx',
				label: t('timeReports.timesheetExport.XLSX'),
				icon: <FileSheet />,
				run: () => runXlsx(input)
			},
			{
				key: 'pdf',
				label: t('timeReports.timesheetExport.PDF'),
				icon: <FilePdf />,
				run: () => runPdf(input)
			}
		];
	}, [appliedFilters, locale, logs, period, search, statusFilter, t]);
}
