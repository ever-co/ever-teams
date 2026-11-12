'use client';

import { useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { FilePdf, FileSheet } from '@/core/components/icons';
import type { WeeklyLimitShown } from '@/core/hooks/dashboards/weekly-limit/use-weekly-limit-report';
import {
	type CsvColumn,
	downloadCsv,
	downloadPdf,
	localDayKeyOf,
	periodFileNameOf
} from '@/core/lib/utils/dashboard-export';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import {
	clockHoursOf,
	leftOf,
	overrunOf,
	periodEndOf,
	periodLabelOf,
	type LimitDuration,
	type LimitEntry,
	type LimitGroup,
	type LimitGrouping
} from '@/core/lib/utils/dashboards/weekly-limit';
import type { TTimeLimitReportByEmployee, TTimeLimitReportList } from '@/core/types/schemas';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import type { FormatLocale } from '@/core/lib/utils/workspace-formats';
import { VERDICT_LABEL_KEYS } from './limit-cells';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIXES: Record<LimitDuration, string> = {
	day: 'daily-limit',
	week: 'weekly-limit'
};

const PERIOD_COLUMN_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.COLUMN_DAY',
	week: 'dashboard.weeklyLimit.COLUMN_WEEK'
};

function sharePercentOf(entry: LimitEntry) {
	const tenths = Math.round(entry.share * 10);
	return tenths / 10;
}

function limitSourceKeyOf(entry: LimitEntry): DottedLanguageObjectStringPaths {
	if (entry.isStandardLimit) {
		return 'dashboard.weeklyLimit.LIMIT_SOURCE_STANDARD';
	}
	return 'dashboard.weeklyLimit.LIMIT_SOURCE_MEMBER';
}

function dayCellOf(entry: LimitEntry) {
	return localDayKeyOf(entry.periodStart);
}

function weekEndCellOf(entry: LimitEntry) {
	const weekEnd = periodEndOf(entry.periodStart, 'week');
	return localDayKeyOf(weekEnd);
}

function trackedCellOf(entry: LimitEntry) {
	return clockHoursOf(entry.used);
}

function limitCellOf(entry: LimitEntry) {
	return clockHoursOf(entry.limit);
}

function remainingCellOf(entry: LimitEntry) {
	const left = leftOf(entry.remaining);
	return clockHoursOf(left);
}

function overByCellOf(entry: LimitEntry) {
	const overrun = overrunOf(entry.remaining);
	return clockHoursOf(overrun);
}

function periodColumnsOf(duration: LimitDuration, t: Translate): CsvColumn<LimitEntry>[] {
	if (duration === 'week') {
		return [
			{ header: t('dashboard.weeklyLimit.CSV_WEEK_START'), valueOf: dayCellOf },
			{ header: t('dashboard.weeklyLimit.CSV_WEEK_END'), valueOf: weekEndCellOf }
		];
	}
	return [{ header: t('dashboard.weeklyLimit.CSV_DAY'), valueOf: dayCellOf }];
}

function csvColumnsOf(duration: LimitDuration, t: Translate): CsvColumn<LimitEntry>[] {
	const statusCellOf = (entry: LimitEntry) => t(VERDICT_LABEL_KEYS[entry.verdict]);
	const limitSourceCellOf = (entry: LimitEntry) => t(limitSourceKeyOf(entry));
	return [
		...periodColumnsOf(duration, t),
		{ header: t('common.MEMBER'), valueOf: (entry) => entry.name },
		{ header: t('dashboard.weeklyLimit.CSV_TRACKED'), valueOf: trackedCellOf },
		{ header: t('dashboard.weeklyLimit.CSV_LIMIT'), valueOf: limitCellOf },
		{ header: t('dashboard.weeklyLimit.CSV_LIMIT_USED'), valueOf: sharePercentOf },
		{ header: t('dashboard.weeklyLimit.CSV_REMAINING'), valueOf: remainingCellOf },
		{ header: t('dashboard.weeklyLimit.CSV_OVER_BY'), valueOf: overByCellOf },
		{ header: t('common.STATUS'), valueOf: statusCellOf },
		{ header: t('dashboard.weeklyLimit.CSV_LIMIT_SOURCE'), valueOf: limitSourceCellOf }
	];
}

function rowsInViewOrder(groups: ReadonlyArray<LimitGroup>) {
	return groups.flatMap((group) => group.entries);
}

function pdfEmployeeOf(entry: LimitEntry, name: string) {
	return { ...entry.employee, fullName: name };
}

/**
 * The existing documents print `date` as it is in date mode and close a week on the locale's Saturday, so each group
 * is handed over with its own label and its resolved limit, in date mode.
 */
function pdfReportsByPeriodOf(
	groups: ReadonlyArray<LimitGroup>,
	duration: LimitDuration,
	locale: FormatLocale
): TTimeLimitReportList[] {
	const reports: TTimeLimitReportList[] = [];
	for (const group of groups) {
		const periodStart = group.periodStart;
		if (!periodStart) {
			continue;
		}
		const employees = group.entries.map((entry) => ({
			employee: pdfEmployeeOf(entry, entry.name),
			duration: entry.used,
			durationPercentage: entry.share,
			limit: entry.limit
		}));
		const date = periodLabelOf(periodStart, duration, locale);
		reports.push({ date, employees });
	}
	return reports;
}

function pdfReportsByMemberOf(
	groups: ReadonlyArray<LimitGroup>,
	duration: LimitDuration,
	locale: FormatLocale
): TTimeLimitReportByEmployee[] {
	const reports: TTimeLimitReportByEmployee[] = [];
	for (const group of groups) {
		const firstEntry = group.entries[0];
		const member = group.member;
		if (!firstEntry) {
			continue;
		}
		if (!member) {
			continue;
		}
		const rows = group.entries.map((entry) => ({
			date: periodLabelOf(entry.periodStart, duration, locale),
			duration: entry.used,
			durationPercentage: entry.share,
			limit: entry.limit
		}));
		const employee = pdfEmployeeOf(firstEntry, member.name);
		reports.push({ employee, reports: rows });
	}
	return reports;
}

function pdfIndexHeaderKeyOf(grouping: LimitGrouping, duration: LimitDuration): DottedLanguageObjectStringPaths {
	if (grouping === 'member') {
		return PERIOD_COLUMN_KEYS[duration];
	}
	return 'common.MEMBER';
}

interface PdfInput {
	shown: WeeklyLimitShown;
	groups: ReadonlyArray<LimitGroup>;
	grouping: LimitGrouping;
	title: string;
	locale: FormatLocale;
	t: Translate;
}

async function pdfDocumentOf({ shown, groups, grouping, title, locale, t }: PdfInput) {
	const sharedProps = {
		headers: {
			indexValue: t(pdfIndexHeaderKeyOf(grouping, shown.duration)),
			timeSpent: t('pages.timeLimitReport.TIME_SPENT'),
			limit: t('pages.timeLimitReport.LIMIT'),
			percentageUsed: t('pages.timeLimitReport.PERCENTAGE_USED'),
			remaining: t('pages.timeLimitReport.REMAINING')
		},
		displayMode: 'date' as const,
		organizationLimits: { date: shown.standardLimit, week: shown.standardLimit },
		title
	};
	if (grouping === 'member') {
		const { WeeklyLimitByEmployeePDFDocument } =
			await import('@/core/components/pages/reports/weekly-limit/export-formats/pdf/grouped-by-employee');
		const data = pdfReportsByMemberOf(groups, shown.duration, locale);
		return <WeeklyLimitByEmployeePDFDocument data={data} {...sharedProps} />;
	}
	const { WeeklyLimitPDFDocument } =
		await import('@/core/components/pages/reports/weekly-limit/export-formats/pdf/index');
	const data = pdfReportsByPeriodOf(groups, shown.duration, locale);
	return <WeeklyLimitPDFDocument data={data} {...sharedProps} />;
}

export function useWeeklyLimitExportOptions({
	shown,
	groups,
	grouping,
	reportTitle,
	teamName
}: Readonly<{
	shown: WeeklyLimitShown | null;
	groups: ReadonlyArray<LimitGroup>;
	grouping: LimitGrouping;
	reportTitle: string;
	teamName: string;
}>): ExportOption[] {
	const t = useTranslations();
	const locale = useWorkspaceLocale();

	return useMemo(() => {
		if (!shown) {
			return [];
		}
		const file = exportFileOf({ shown, reportTitle, teamName, locale, t });
		const pdfInput: PdfInput = { shown, groups, grouping, title: file.title, locale, t };

		return [
			{
				key: 'pdf',
				label: t('common.PDF'),
				icon: <FilePdf />,
				run: () => downloadPdf(() => pdfDocumentOf(pdfInput), file.pdfFileName)
			},
			csvOptionOf(shown, groups, file.csvFileName, t)
		];
	}, [groups, grouping, locale, reportTitle, shown, t, teamName]);
}

interface ExportFile {
	title: string;
	pdfFileName: string;
	csvFileName: string;
}

function exportFileOf({
	shown,
	reportTitle,
	teamName,
	locale,
	t
}: Readonly<{
	shown: WeeklyLimitShown;
	reportTitle: string;
	teamName: string;
	locale: FormatLocale;
	t: Translate;
}>): ExportFile {
	const prefix = FILE_PREFIXES[shown.duration];
	const periodText = formatPeriod(shown.period, locale);
	const title = t('dashboard.weeklyLimit.PDF_TITLE', {
		report: reportTitle,
		team: teamName,
		period: periodText
	});
	const pdfFileName = periodFileNameOf(prefix, shown.period.from, shown.period.to, 'pdf');
	const csvFileName = periodFileNameOf(prefix, shown.period.from, shown.period.to, 'csv');
	return { title, pdfFileName, csvFileName };
}

function csvOptionOf(
	shown: WeeklyLimitShown,
	groups: ReadonlyArray<LimitGroup>,
	csvFileName: string,
	t: Translate
): ExportOption {
	return {
		key: 'csv',
		label: t('dashboard.weeklyLimit.CSV'),
		icon: <FileSheet />,
		run: () => {
			const rows = rowsInViewOrder(groups);
			const columns = csvColumnsOf(shown.duration, t);
			downloadCsv(rows, columns, csvFileName);
		}
	};
}

const PDF_BY_PERIOD_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.EXPORT_PDF_BY_DAY',
	week: 'dashboard.weeklyLimit.EXPORT_PDF_BY_WEEK'
};

/**
 * The heatmap reads by member and by day at once, so both existing PDF documents stay one click away instead of
 * following a grouping switch. The CSV keeps its columns and lists the rows day by day.
 */
export function useWeeklyLimitMatrixExportOptions({
	shown,
	periodGroups,
	memberGroups,
	reportTitle,
	teamName
}: Readonly<{
	shown: WeeklyLimitShown | null;
	periodGroups: ReadonlyArray<LimitGroup>;
	memberGroups: ReadonlyArray<LimitGroup>;
	reportTitle: string;
	teamName: string;
}>): ExportOption[] {
	const t = useTranslations();
	const locale = useWorkspaceLocale();

	return useMemo(() => {
		if (!shown) {
			return [];
		}
		const file = exportFileOf({ shown, reportTitle, teamName, locale, t });
		const byPeriodInput: PdfInput = {
			shown,
			groups: periodGroups,
			grouping: 'period',
			title: file.title,
			locale,
			t
		};
		const byMemberInput: PdfInput = {
			shown,
			groups: memberGroups,
			grouping: 'member',
			title: file.title,
			locale,
			t
		};

		return [
			{
				key: 'pdf-period',
				label: t(PDF_BY_PERIOD_KEYS[shown.duration]),
				icon: <FilePdf />,
				run: () => downloadPdf(() => pdfDocumentOf(byPeriodInput), file.pdfFileName)
			},
			{
				key: 'pdf-member',
				label: t('dashboard.weeklyLimit.EXPORT_PDF_BY_MEMBER'),
				icon: <FilePdf />,
				run: () => downloadPdf(() => pdfDocumentOf(byMemberInput), file.pdfFileName)
			},
			csvOptionOf(shown, periodGroups, file.csvFileName, t)
		];
	}, [locale, memberGroups, periodGroups, reportTitle, shown, t, teamName]);
}
