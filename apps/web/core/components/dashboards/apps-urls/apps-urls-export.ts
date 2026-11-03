import type { useTranslations } from 'next-intl';
import { formatDurationShort, formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import { downloadCsv, downloadPdf, periodFileNameOf, type CsvColumn } from '@/core/lib/utils/dashboard-export';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import {
	formatDayLabel,
	formatHoursMinutes,
	sortUsageGroups,
	VIEW_COLUMNS,
	type AppUsageRow,
	type AppsUrlsView,
	type UsageFigures,
	type UsageGroup,
	type UsageGroupRow
} from '@/core/lib/utils/dashboards/apps-urls';
import type { AppsUrlsPdfData, AppsUrlsPdfGroup, AppsUrlsPdfLine } from './export/apps-urls-pdf-data';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'apps-and-urls';

export interface AppsUrlsExportInput {
	rows: ReadonlyArray<AppUsageRow>;
	/** The groups of the view on screen; the PDF prints them in the screen's natural order. */
	groups: ReadonlyArray<UsageGroup>;
	view: AppsUrlsView;
	period: Period;
	figures: UsageFigures;
	locale: string;
	t: Translate;
}

interface CsvLine {
	dateKey: string;
	member: string;
	project: string;
	title: string;
	seconds: number;
	share: number;
}

function roundedShare(share: number) {
	return Math.round(share * 10) / 10;
}

function byDayThenLongest(first: CsvLine, second: CsvLine) {
	const byDay = first.dateKey.localeCompare(second.dateKey);
	if (byDay !== 0) {
		return byDay;
	}
	return second.seconds - first.seconds;
}

function memberNameOf(row: { employee: { name: string } }, t: Translate) {
	if (row.employee.name) {
		return row.employee.name;
	}
	return t('dashboard.appsUrls.UNKNOWN_MEMBER');
}

function projectNameOf(row: { project: { name: string | null } }, t: Translate) {
	if (row.project.name) {
		return row.project.name;
	}
	return t('dashboard.appsUrls.NO_PROJECT');
}

function titleOf(title: string, t: Translate) {
	if (title) {
		return title;
	}
	return t('dashboard.appsUrls.UNTITLED');
}

function csvLinesOf(input: AppsUrlsExportInput): CsvLine[] {
	const { rows, figures, t } = input;
	const lines = rows.map((row) => ({
		dateKey: row.dateKey,
		member: memberNameOf(row, t),
		project: projectNameOf(row, t),
		title: titleOf(row.title, t),
		seconds: row.seconds,
		share: percentOf(row.seconds, figures.totalSeconds)
	}));
	lines.sort(byDayThenLongest);
	return lines;
}

/** One line per app or site, member, project and day; durations as `h:mm`, the share of the whole period. */
export function downloadAppsUrlsCsv(input: AppsUrlsExportInput) {
	const { t, period } = input;
	const columns: CsvColumn<CsvLine>[] = [
		{ header: t('dashboard.appsUrls.CSV_DATE'), valueOf: (line) => line.dateKey },
		{ header: t('dashboard.appsUrls.COLUMN_MEMBER'), valueOf: (line) => line.member },
		{ header: t('dashboard.appsUrls.COLUMN_PROJECT_NAME'), valueOf: (line) => line.project },
		{ header: t('dashboard.appsUrls.COLUMN_TITLE'), valueOf: (line) => line.title },
		{ header: t('dashboard.appsUrls.CSV_TIME'), valueOf: (line) => formatHoursMinutes(line.seconds) },
		{ header: t('dashboard.appsUrls.CSV_SHARE'), valueOf: (line) => roundedShare(line.share) }
	];
	const fileName = periodFileNameOf(FILE_PREFIX, period.from, period.to, 'csv');
	downloadCsv(csvLinesOf(input), columns, fileName);
}

function groupLabelOf(group: UsageGroup, input: AppsUrlsExportInput) {
	const { locale, t } = input;
	switch (group.view) {
		case 'date':
			return formatDayLabel(group.sample.dateKey, locale);
		case 'employee':
			return memberNameOf(group.sample, t);
		case 'project':
			return projectNameOf(group.sample, t);
		case 'application':
			return titleOf(group.sample.title, t);
	}
}

function groupMetaOf(group: UsageGroup, t: Translate) {
	if (group.view === 'application') {
		return t('dashboard.appsUrls.DAY_COUNT', { count: group.dayCount });
	}
	return t('dashboard.appsUrls.TITLE_COUNT', { count: group.titleCount });
}

function lineLeadOf(line: UsageGroupRow, input: AppsUrlsExportInput) {
	if (input.view === 'application') {
		return formatDayLabel(line.dateKey, input.locale);
	}
	return titleOf(line.title, input.t);
}

function pdfLineOf(line: UsageGroupRow, input: AppsUrlsExportInput): AppsUrlsPdfLine {
	return {
		key: line.key,
		lead: lineLeadOf(line, input),
		member: memberNameOf(line, input.t),
		project: projectNameOf(line, input.t),
		time: formatDurationShort(line.seconds),
		share: formatPercent(line.share)
	};
}

function pdfGroupOf(group: UsageGroup, input: AppsUrlsExportInput): AppsUrlsPdfGroup {
	return {
		key: group.key,
		label: groupLabelOf(group, input),
		meta: groupMetaOf(group, input.t),
		time: formatDurationShort(group.seconds),
		share: formatPercent(group.share),
		lines: group.rows.map((line) => pdfLineOf(line, input))
	};
}

const PDF_FIRST_COLUMN_KEYS = {
	date: 'dashboard.appsUrls.COLUMN_DATE',
	employee: 'dashboard.appsUrls.COLUMN_EMPLOYEE',
	project: 'dashboard.appsUrls.COLUMN_PROJECT',
	application: 'dashboard.appsUrls.COLUMN_APPLICATION'
} as const;

const PDF_GROUP_COUNT_KEYS = {
	date: 'dashboard.appsUrls.DAY_COUNT',
	employee: 'dashboard.appsUrls.MEMBER_COUNT',
	project: 'dashboard.appsUrls.PROJECT_COUNT',
	application: 'dashboard.appsUrls.TITLE_COUNT'
} as const;

function topTitleOf(figures: UsageFigures, t: Translate) {
	const top = figures.top;
	if (!top) {
		return '–';
	}
	return titleOf(top.title, t);
}

function pdfDataOf(input: AppsUrlsExportInput): AppsUrlsPdfData {
	const { figures, groups, locale, period, t, view } = input;
	const columns = VIEW_COLUMNS[view];
	const orderedGroups = sortUsageGroups(groups, view, null);
	const generatedFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
	const generatedOn = generatedFormat.format(new Date());
	return {
		title: t('sidebar.APPS_AND_URLS'),
		subtitle: formatPeriod(period, locale),
		generated: t('dashboard.appsUrls.PDF_GENERATED', { date: generatedOn }),
		figures: [
			{ label: t('dashboard.appsUrls.TIME_LABEL'), value: formatDurationShort(figures.totalSeconds) },
			{ label: t('dashboard.appsUrls.TITLES_LABEL'), value: String(figures.titleCount) },
			{ label: t('common.MEMBERS'), value: String(figures.memberCount) },
			{ label: t('dashboard.appsUrls.TOP_LABEL'), value: topTitleOf(figures, t) }
		],
		columns: {
			lead: t(PDF_FIRST_COLUMN_KEYS[view]),
			member: t('dashboard.appsUrls.COLUMN_MEMBER'),
			project: t('dashboard.appsUrls.COLUMN_PROJECT_NAME'),
			time: t('dashboard.appsUrls.COLUMN_TIME'),
			share: t('dashboard.appsUrls.COLUMN_SHARE')
		},
		showsMember: columns.showsMember,
		showsProject: columns.showsProject,
		groups: orderedGroups.map((group) => pdfGroupOf(group, input)),
		totals: {
			label: t(PDF_GROUP_COUNT_KEYS[view], { count: orderedGroups.length }),
			time: formatDurationShort(figures.totalSeconds)
		}
	};
}

/**
 * The report as it is grouped on screen, every grouping included. The renderer and the document are imported on
 * the click, and the document uses the PDF's built-in Helvetica, so nothing is fetched from a font server.
 */
export async function downloadAppsUrlsPdf(input: AppsUrlsExportInput) {
	const data = pdfDataOf(input);
	const fileName = periodFileNameOf(FILE_PREFIX, input.period.from, input.period.to, 'pdf');
	await downloadPdf(async () => {
		const { appsUrlsPdfDocumentOf } = await import('./export/apps-urls-pdf');
		return appsUrlsPdfDocumentOf(data);
	}, fileName);
}
