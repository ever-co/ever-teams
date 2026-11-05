'use client';

import { useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { type ExportOption, ExportMenu } from '@/core/components/dashboards/kit/export-menu';
import { FilePdf, FileSheet, FileText } from '@/core/components/icons';
import { APP_NAME } from '@/core/constants/config/constants';
import type { TimeActivityFigures } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import type { TimeActivityFilterOptions } from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { type CsvColumn, downloadCsv, downloadPdf, periodFileNameOf } from '@/core/lib/utils/dashboard-export';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { type CurrencyAmount, formatAmount, formatAmounts } from '@/core/lib/utils/daily-report-figures';
import {
	type ExportGroup,
	TIME_ACTIVITY_FILTER_FIELDS,
	type BreakdownGrouping,
	type TimeActivityExportRow,
	type TimeActivityFilterField,
	type TimeActivityFilters,
	dateOfKey,
	exportGroupsOf,
	exportRowsOf,
	recordedActivityOf
} from '@/core/lib/utils/dashboards/time-activity';
import { exportToXLSX } from '@/core/lib/utils/export-utils';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import type { PdfFigure, PdfGroup, PdfRow, TimeActivityPdfContent } from './time-activity-report-pdf';

const FILE_PREFIX = 'time-activity-report';

const MISSING_VALUE = '–';

const SECONDS_PER_DAY = 86400;

const SECONDS_PER_HOUR = 3600;

const FILTER_LABEL_KEYS: Record<TimeActivityFilterField, DottedLanguageObjectStringPaths> = {
	teamIds: 'dashboard.timeActivity.filters.TEAMS',
	employeeIds: 'dashboard.timeActivity.filters.MEMBERS',
	projectIds: 'dashboard.timeActivity.filters.PROJECTS',
	taskIds: 'dashboard.timeActivity.filters.TASKS'
};

type Translate = ReturnType<typeof useTranslations>;

interface ExportContext {
	report: ReadonlyArray<ITimeLogGroupedDailyReport>;
	period: Period;
	grouping: BreakdownGrouping;
	isManager: boolean;
	ownEmployeeId: string | undefined;
	figures: TimeActivityFigures;
	filters: TimeActivityFilters;
	filterOptions: TimeActivityFilterOptions;
	locale: string;
	t: Translate;
}

interface NamedRow {
	row: TimeActivityExportRow;
	member: string;
	project: string;
	task: string;
	status: string;
}

function onlyEmployeeIdOf(context: ExportContext) {
	if (context.isManager) {
		return null;
	}
	return context.ownEmployeeId ?? null;
}

function namedRowsOf(context: ExportContext): NamedRow[] {
	const { t } = context;
	const withoutTeamLabel = t('dashboard.NO_TEAM_GROUP');
	const rows = exportRowsOf(context.report, onlyEmployeeIdOf(context), withoutTeamLabel);
	const unnamed = t('timeActivity.UNNAMED_EMPLOYEE');
	const noProject = t('common.NO_PROJECT');
	const noTask = t('dashboard.timeActivity.export.NO_TASK');
	return rows.map((row) => ({
		row,
		member: row.member || unnamed,
		project: row.project ?? noProject,
		task: row.task ?? noTask,
		status: row.status ?? ''
	}));
}

function roundedTo2(value: number) {
	const scaled = Math.round(value * 100);
	return scaled / 100;
}

function hoursOf(seconds: number) {
	const hours = seconds / SECONDS_PER_HOUR;
	return roundedTo2(hours);
}

function nullableAmountOf(earnings: number | null) {
	if (earnings === null) {
		return null;
	}
	return roundedTo2(earnings);
}

function spreadsheetAmountOf(earnings: number | null) {
	if (earnings === null) {
		return '';
	}
	return roundedTo2(earnings);
}

function csvColumnsOf(context: ExportContext): CsvColumn<NamedRow>[] {
	const { t } = context;
	const columns: CsvColumn<NamedRow>[] = [
		{ header: t('common.DATE'), valueOf: (named) => named.row.dateKey },
		{ header: t('common.MEMBER'), valueOf: (named) => named.member },
		{ header: t('dashboard.timeActivity.grouping.PROJECT'), valueOf: (named) => named.project },
		{ header: t('dashboard.timeActivity.export.TASK'), valueOf: (named) => named.task },
		{ header: t('dashboard.timeActivity.export.STATUS'), valueOf: (named) => named.status },
		{ header: t('dashboard.timeActivity.export.TRACKED_HOURS'), valueOf: (named) => hoursOf(named.row.seconds) }
	];
	if (context.isManager) {
		columns.push(
			{
				header: t('dashboard.timeActivity.columns.EARNINGS'),
				valueOf: (named) => nullableAmountOf(named.row.earnings)
			},
			{ header: t('dashboard.timeActivity.export.CURRENCY'), valueOf: (named) => named.row.currency }
		);
	}
	columns.push({
		header: t('dashboard.timeActivity.export.ACTIVITY_PERCENT'),
		valueOf: (named) => Math.round(named.row.activity)
	});
	return columns;
}

function runCsv(context: ExportContext) {
	const rows = namedRowsOf(context);
	const fileName = periodFileNameOf(FILE_PREFIX, context.period.from, context.period.to, 'csv');
	downloadCsv(rows, csvColumnsOf(context), fileName);
}

interface XlsxColumn {
	header: string;
	value: (named: NamedRow) => string | number;
	width?: number;
	format?: string;
}

/** The previous export's columns, with earnings kept as numbers beside their currency instead of a `$` string. */
function xlsxColumnsOf(context: ExportContext): XlsxColumn[] {
	const { t } = context;
	const columns: XlsxColumn[] = [
		{ header: t('common.DATE'), value: (named) => named.row.dateKey, width: 12 },
		{ header: t('common.MEMBER'), value: (named) => named.member, width: 24 },
		{ header: t('dashboard.timeActivity.grouping.PROJECT'), value: (named) => named.project, width: 24 },
		{ header: t('dashboard.timeActivity.export.TASK'), value: (named) => named.task, width: 40 },
		{ header: t('dashboard.timeActivity.export.STATUS'), value: (named) => named.status, width: 16 },
		{
			header: t('dashboard.timeActivity.columns.TRACKED'),
			value: (named) => named.row.seconds / SECONDS_PER_DAY,
			format: '[h]:mm',
			width: 14
		}
	];
	if (context.isManager) {
		columns.push(
			{
				header: t('dashboard.timeActivity.columns.EARNINGS'),
				value: (named) => spreadsheetAmountOf(named.row.earnings),
				format: '#,##0.00',
				width: 14
			},
			{
				header: t('dashboard.timeActivity.export.CURRENCY'),
				value: (named) => named.row.currency ?? '',
				width: 10
			}
		);
	}
	columns.push({
		header: t('dashboard.timeActivity.columns.ACTIVITY'),
		value: (named) => named.row.activity / 100,
		format: '0%',
		width: 12
	});
	return columns;
}

async function runXlsx(context: ExportContext) {
	const rows = namedRowsOf(context);
	const fileName = periodFileNameOf(FILE_PREFIX, context.period.from, context.period.to, 'xlsx');
	await exportToXLSX(rows, xlsxColumnsOf(context), fileName);
}

function amountsTextOf(amounts: ReadonlyArray<CurrencyAmount>, locale: string) {
	const hasAmounts = amounts.length > 0;
	if (!hasAmounts) {
		return MISSING_VALUE;
	}
	return formatAmounts(amounts, locale);
}

function rowAmountTextOf(row: TimeActivityExportRow, locale: string) {
	const hasAmount = row.earnings !== null;
	const hasCurrency = row.currency !== null;
	const isPriced = hasAmount && hasCurrency;
	if (!isPriced) {
		return MISSING_VALUE;
	}
	const amount = row.earnings ?? 0;
	const currency = row.currency ?? '';
	return formatAmount({ amount, currency }, locale);
}

function percentTextOf(seconds: number, activeSeconds: number) {
	if (seconds <= 0) {
		return MISSING_VALUE;
	}
	const share = (activeSeconds / seconds) * 100;
	return `${Math.round(share)}%`;
}

function printedPeriodOf(period: Period, locale: string) {
	const format = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' });
	return format.formatRange(period.from, period.to);
}

function filterLinesOf(context: ExportContext): PdfFigure[] {
	const { t, filters, filterOptions } = context;
	const unlisted = t('dashboard.timeActivity.filters.UNLISTED');
	const lines: PdfFigure[] = [];
	for (const field of TIME_ACTIVITY_FILTER_FIELDS) {
		const values = filters[field];
		if (values.length === 0) {
			continue;
		}
		const names = values.map((value) => {
			const option = filterOptions[field].find((candidate) => candidate.value === value);
			return option?.name ?? unlisted;
		});
		lines.push({ label: t(FILTER_LABEL_KEYS[field]), value: names.join(', ') });
	}
	return lines;
}

/** The same total as the page's band: the daily report, every log type. */
function trackedSummaryOf(figures: TimeActivityFigures) {
	if (figures.reportSeconds === null) {
		return MISSING_VALUE;
	}
	return formatDurationShort(figures.reportSeconds);
}

/** Same reading as the page: a period without measured activity prints "–", never 0%. */
function activitySummaryOf(figures: TimeActivityFigures) {
	const percent = recordedActivityOf(figures.activityPercent, figures.trackedSeconds);
	if (percent === null) {
		return MISSING_VALUE;
	}
	const rounded = Math.round(percent);
	return `${rounded}%`;
}

function summaryOf(context: ExportContext): PdfFigure[] {
	const { t, figures, locale } = context;
	const summary: PdfFigure[] = [
		{ label: t('dashboard.timeActivity.figures.TRACKED'), value: trackedSummaryOf(figures) },
		{ label: t('dashboard.timeActivity.figures.ACTIVITY'), value: activitySummaryOf(figures) }
	];
	if (context.isManager) {
		summary.push({
			label: t('dashboard.timeActivity.figures.EARNINGS'),
			value: amountsTextOf(figures.totals.earnings, locale)
		});
	}
	summary.push({ label: t('dashboard.timeActivity.figures.MEMBERS'), value: String(figures.totals.memberCount) });
	return summary;
}

interface PdfLayout {
	firstHeader: string;
	secondHeader: string;
	groupTitle: (group: ExportGroup, named: NamedRow) => string;
	first: (named: NamedRow) => string;
	second: (named: NamedRow) => string;
}

function pdfLayoutOf(context: ExportContext): PdfLayout {
	const { t, locale } = context;
	const longDay = new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
	const shortDay = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' });
	const dayHeader = t('common.DATE');
	const memberHeader = t('common.MEMBER');
	const projectHeader = t('dashboard.timeActivity.grouping.PROJECT');
	const shortDayOf = (named: NamedRow) => shortDay.format(dateOfKey(named.row.dateKey));
	if (context.grouping === 'date') {
		return {
			firstHeader: memberHeader,
			secondHeader: projectHeader,
			groupTitle: (group) => longDay.format(dateOfKey(group.key)),
			first: (named) => named.member,
			second: (named) => named.project
		};
	}
	if (context.grouping === 'member') {
		return {
			firstHeader: dayHeader,
			secondHeader: projectHeader,
			groupTitle: (_group, named) => named.member,
			first: shortDayOf,
			second: (named) => named.project
		};
	}
	if (context.grouping === 'task') {
		return {
			firstHeader: dayHeader,
			secondHeader: memberHeader,
			groupTitle: (_group, named) => named.task,
			first: shortDayOf,
			second: (named) => named.member
		};
	}
	return {
		firstHeader: dayHeader,
		secondHeader: memberHeader,
		groupTitle: (_group, named) => named.project,
		first: shortDayOf,
		second: (named) => named.member
	};
}

function pdfGroupsOf(context: ExportContext, layout: PdfLayout): PdfGroup[] {
	const { locale } = context;
	const namedRows = namedRowsOf(context);
	const namedByRow = new Map(namedRows.map((named) => [named.row, named]));
	const groups = exportGroupsOf(
		namedRows.map((named) => named.row),
		context.grouping
	);
	const pdfGroups: PdfGroup[] = [];
	for (const group of groups) {
		const groupRows = compactNamed(group.rows, namedByRow);
		const firstNamed = groupRows[0];
		if (!firstNamed) {
			continue;
		}
		const rows: PdfRow[] = groupRows.map((named, index) => ({
			key: `${group.key}:${index}`,
			first: layout.first(named),
			second: layout.second(named),
			task: named.task,
			tracked: formatDurationShort(named.row.seconds),
			earnings: rowAmountTextOf(named.row, locale),
			activity: `${Math.round(named.row.activity)}%`
		}));
		pdfGroups.push({
			key: group.key,
			title: layout.groupTitle(group, firstNamed),
			tracked: formatDurationShort(group.seconds),
			earnings: amountsTextOf(group.earnings, locale),
			activity: percentTextOf(group.seconds, group.activeSeconds),
			rows
		});
	}
	return pdfGroups;
}

function compactNamed(rows: ReadonlyArray<TimeActivityExportRow>, namedByRow: Map<TimeActivityExportRow, NamedRow>) {
	const named: NamedRow[] = [];
	for (const row of rows) {
		const match = namedByRow.get(row);
		if (match) {
			named.push(match);
		}
	}
	return named;
}

function pdfContentOf(context: ExportContext): TimeActivityPdfContent {
	const { t, locale } = context;
	const layout = pdfLayoutOf(context);
	const title = t('dashboard.timeActivity.export.DOCUMENT_TITLE');
	const generatedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date());
	return {
		title,
		period: printedPeriodOf(context.period, locale),
		generatedOn: t('dashboard.timeActivity.export.GENERATED_ON', { date: generatedDate }),
		filtersTitle: t('dashboard.timeActivity.export.FILTERS'),
		filters: filterLinesOf(context),
		summary: summaryOf(context),
		columns: {
			first: layout.firstHeader,
			second: layout.secondHeader,
			task: t('dashboard.timeActivity.export.TASK'),
			tracked: t('dashboard.timeActivity.columns.TRACKED'),
			earnings: t('dashboard.timeActivity.columns.EARNINGS'),
			activity: t('dashboard.timeActivity.columns.ACTIVITY')
		},
		showsEarnings: context.isManager,
		groups: pdfGroupsOf(context, layout),
		footer: `${APP_NAME} · ${title}`,
		pageLabel: (page, total) => t('dashboard.timeActivity.export.PAGE', { page, total })
	};
}

async function runPdf(context: ExportContext) {
	const content = pdfContentOf(context);
	const fileName = periodFileNameOf(FILE_PREFIX, context.period.from, context.period.to, 'pdf');
	await downloadPdf(async () => {
		const { buildTimeActivityPdf } = await import('./time-activity-report-pdf');
		return buildTimeActivityPdf(content);
	}, fileName);
}

/** Rows are built on the click; the PDF renderer, its document and the sheet writer are imported then. */
export function TimeActivityExportMenu({
	report,
	period,
	grouping,
	isManager,
	ownEmployeeId,
	figures,
	filters,
	filterOptions,
	isDisabled
}: Readonly<Omit<ExportContext, 'locale' | 't'> & { isDisabled: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();

	const options = useMemo<ExportOption[]>(() => {
		const context: ExportContext = {
			report,
			period,
			grouping,
			isManager,
			ownEmployeeId,
			figures,
			filters,
			filterOptions,
			locale,
			t
		};
		return [
			{
				key: 'pdf',
				label: t('dashboard.timeActivity.export.PDF'),
				icon: <FilePdf />,
				run: () => runPdf(context)
			},
			{
				key: 'xlsx',
				label: t('dashboard.timeActivity.export.XLSX'),
				icon: <FileSheet />,
				run: () => runXlsx(context)
			},
			{
				key: 'csv',
				label: t('dashboard.timeActivity.export.CSV'),
				icon: <FileText />,
				run: () => runCsv(context)
			}
		];
	}, [figures, filterOptions, filters, grouping, isManager, locale, ownEmployeeId, period, report, t]);

	return <ExportMenu options={options} isDisabled={isDisabled} />;
}
