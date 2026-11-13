'use client';

import { useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { FilePdf, FileSheet } from '@/core/components/icons';
import type { ActualExpectedShown } from '@/core/hooks/dashboards/actual-expected/use-actual-expected-report';
import { type CsvColumn, downloadCsv, downloadPdf, periodFileNameOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort, formatHoursLabel, percentOf } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import {
	clockHoursOf,
	dayLabelPartsOf,
	differenceOf,
	signedClockHoursOf,
	wholePercentOf,
	type MemberDay,
	type PlanGroup,
	type PlanGrouping,
	type PlanTotals
} from '@/core/lib/utils/dashboards/actual-expected';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import type { PlanPdfContent, PlanPdfFigure, PlanPdfGroup, PlanPdfLine } from './actual-expected-report-pdf';
import { SOURCE_LABEL_KEYS } from './plan-cells';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'actual-and-expected-hours';

const MISSING_FIGURE = '–';

const FIRST_COLUMN_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'common.MEMBER',
	day: 'dashboard.weeklyLimit.COLUMN_DAY'
};

function expectedCellOf(memberDay: MemberDay) {
	const expected = memberDay.expected;
	if (expected === null) {
		return null;
	}
	return clockHoursOf(expected);
}

function taskEstimatesCellOf(memberDay: MemberDay) {
	const taskEstimates = memberDay.taskEstimates;
	if (taskEstimates === null) {
		return null;
	}
	return clockHoursOf(taskEstimates);
}

function differenceCellOf(memberDay: MemberDay) {
	const difference = differenceOf(memberDay.expected, memberDay.actual);
	if (difference === null) {
		return null;
	}
	return signedClockHoursOf(difference);
}

function reachedCellOf(memberDay: MemberDay) {
	const expected = memberDay.expected;
	if (expected === null) {
		return null;
	}
	const share = percentOf(memberDay.actual, expected);
	return wholePercentOf(share);
}

function fromEstimatesCellOf(memberDay: MemberDay, t: Translate) {
	if (memberDay.source === 'noPlan') {
		return null;
	}
	if (memberDay.source === 'estimates') {
		return t('common.YES');
	}
	return t('common.NO');
}

function csvColumnsOf(t: Translate): CsvColumn<MemberDay>[] {
	return [
		{ header: t('common.MEMBER'), valueOf: (memberDay) => memberDay.name },
		{ header: t('dashboard.actualExpected.CSV_DATE'), valueOf: (memberDay) => memberDay.dayKey },
		{
			header: t('dashboard.actualExpected.CSV_PLAN'),
			valueOf: (memberDay) => t(SOURCE_LABEL_KEYS[memberDay.source])
		},
		{ header: t('dashboard.actualExpected.CSV_EXPECTED'), valueOf: expectedCellOf },
		{
			header: t('dashboard.actualExpected.FROM_ESTIMATES'),
			valueOf: (memberDay) => fromEstimatesCellOf(memberDay, t)
		},
		{ header: t('dashboard.actualExpected.CSV_TASK_ESTIMATES'), valueOf: taskEstimatesCellOf },
		{ header: t('dashboard.actualExpected.CSV_ACTUAL'), valueOf: (memberDay) => clockHoursOf(memberDay.actual) },
		{ header: t('dashboard.actualExpected.CSV_DIFFERENCE'), valueOf: differenceCellOf },
		{ header: t('dashboard.actualExpected.CSV_REACHED'), valueOf: reachedCellOf }
	];
}

function rowsInViewOrder(groups: ReadonlyArray<PlanGroup>) {
	return groups.flatMap((group) => group.rows);
}

function expectedTextOf(expected: number | null, missingLabel: string) {
	if (expected === null) {
		return missingLabel;
	}
	return formatHoursLabel(expected);
}

function differenceTextOf(expected: number | null, actual: number, t: Translate) {
	const difference = differenceOf(expected, actual);
	if (difference === null) {
		return MISSING_FIGURE;
	}
	if (difference > 0) {
		return t('dashboard.actualExpected.DIFFERENCE_OVER', { duration: formatHoursLabel(difference) });
	}
	if (difference < 0) {
		return t('dashboard.actualExpected.DIFFERENCE_UNDER', { duration: formatHoursLabel(-difference) });
	}
	return t('dashboard.actualExpected.ON_PLAN');
}

function reachedTextOf(expected: number | null, actual: number) {
	if (expected === null) {
		return MISSING_FIGURE;
	}
	if (expected <= 0) {
		return MISSING_FIGURE;
	}
	const share = percentOf(actual, expected);
	return `${wholePercentOf(share)}%`;
}

function totalsExpectedOf(totals: PlanTotals) {
	if (!totals.hasExpected) {
		return null;
	}
	return totals.expected;
}

function totalsMissingLabelOf(totals: PlanTotals, t: Translate) {
	if (totals.withoutTimeDays > 0) {
		return t('dashboard.actualExpected.PLAN_WITHOUT_TIME');
	}
	return t('dashboard.actualExpected.NO_PLAN');
}

function totalsLineOf(key: string, first: string, totals: PlanTotals, t: Translate): PlanPdfLine {
	const expected = totalsExpectedOf(totals);
	return {
		key,
		first,
		note: '',
		expected: expectedTextOf(expected, totalsMissingLabelOf(totals, t)),
		actual: formatDurationShort(totals.actual),
		difference: differenceTextOf(expected, totals.actual, t),
		reached: reachedTextOf(expected, totals.actual)
	};
}

function dayTextOf(day: Date, locale: FormatLocale) {
	const { weekday, date } = dayLabelPartsOf(day, locale);
	return `${weekday} ${date}`;
}

function noteOf(memberDay: MemberDay, t: Translate) {
	if (memberDay.source === 'estimates') {
		return t('dashboard.actualExpected.FROM_ESTIMATES');
	}
	const taskEstimates = memberDay.taskEstimates;
	if (taskEstimates === null) {
		return '';
	}
	return t('dashboard.actualExpected.TASK_ESTIMATES_LINE', { duration: formatHoursLabel(taskEstimates) });
}

function rowFirstOf(memberDay: MemberDay, grouping: PlanGrouping, locale: FormatLocale) {
	if (grouping === 'member') {
		return dayTextOf(memberDay.day, locale);
	}
	return memberDay.name;
}

function rowLineOf(memberDay: MemberDay, grouping: PlanGrouping, locale: FormatLocale, t: Translate): PlanPdfLine {
	const missingLabel = t(SOURCE_LABEL_KEYS[memberDay.source]);
	return {
		key: memberDay.key,
		first: rowFirstOf(memberDay, grouping, locale),
		note: noteOf(memberDay, t),
		expected: expectedTextOf(memberDay.expected, missingLabel),
		actual: formatDurationShort(memberDay.actual),
		difference: differenceTextOf(memberDay.expected, memberDay.actual, t),
		reached: reachedTextOf(memberDay.expected, memberDay.actual)
	};
}

function groupTitleOf(group: PlanGroup, locale: FormatLocale) {
	const member = group.member;
	if (member) {
		return member.name;
	}
	const day = group.day;
	if (day) {
		return dayTextOf(day, locale);
	}
	return '';
}

function pdfGroupsOf(
	groups: ReadonlyArray<PlanGroup>,
	grouping: PlanGrouping,
	locale: FormatLocale,
	t: Translate
): PlanPdfGroup[] {
	return groups.map((group) => ({
		key: group.key,
		line: totalsLineOf(group.key, groupTitleOf(group, locale), group.totals, t),
		rows: group.rows.map((memberDay) => rowLineOf(memberDay, grouping, locale, t))
	}));
}

function overTextOf(totals: PlanTotals, t: Translate) {
	if (!totals.hasExpected) {
		return MISSING_FIGURE;
	}
	if (totals.over <= 0) {
		return formatHoursLabel(0);
	}
	return t('dashboard.actualExpected.DIFFERENCE_OVER', { duration: formatHoursLabel(totals.over) });
}

function underTextOf(totals: PlanTotals) {
	if (!totals.hasExpected) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(totals.under);
}

function summaryOf(totals: PlanTotals, t: Translate): PlanPdfFigure[] {
	const expected = totalsExpectedOf(totals);
	return [
		{ label: t('dashboard.actualExpected.EXPECTED'), value: expectedTextOf(expected, MISSING_FIGURE) },
		{ label: t('dashboard.actualExpected.ACTUAL'), value: formatDurationShort(totals.actual) },
		{ label: t('dashboard.actualExpected.OVER_PLAN'), value: overTextOf(totals, t) },
		{ label: t('dashboard.actualExpected.UNDER_PLAN'), value: underTextOf(totals) },
		{ label: t('dashboard.actualExpected.WITHOUT_PLAN'), value: String(totals.unplannedDays) }
	];
}

interface PdfInput {
	shown: ActualExpectedShown;
	groups: ReadonlyArray<PlanGroup>;
	grouping: PlanGrouping;
	title: string;
	periodText: string;
	locale: FormatLocale;
	t: Translate;
}

function pdfContentOf({ shown, groups, grouping, title, periodText, locale, t }: PdfInput): PlanPdfContent {
	const generatedFormat = dateFormatOf(locale, { dateStyle: 'medium', timeStyle: 'short' });
	const generatedDate = generatedFormat.format(new Date());
	const totals = shown.figures.totals;
	const totalLabel = t('common.TOTAL');
	return {
		title,
		period: periodText,
		generatedOn: t('dashboard.timeActivity.export.GENERATED_ON', { date: generatedDate }),
		summary: summaryOf(totals, t),
		columns: {
			first: t(FIRST_COLUMN_KEYS[grouping]),
			expected: t('dashboard.actualExpected.EXPECTED'),
			actual: t('dashboard.actualExpected.ACTUAL'),
			difference: t('dashboard.actualExpected.COLUMN_DIFFERENCE'),
			reached: t('dashboard.actualExpected.COLUMN_REACHED')
		},
		groups: pdfGroupsOf(groups, grouping, locale, t),
		total: totalsLineOf('total', totalLabel, totals, t),
		pageLabel: (page, total) => t('dashboard.timeActivity.export.PAGE', { page, total })
	};
}

async function downloadPlanPdf(input: PdfInput, fileName: string) {
	const content = pdfContentOf(input);
	await downloadPdf(async () => {
		const { buildActualExpectedPdf } = await import('./actual-expected-report-pdf');
		return buildActualExpectedPdf(content);
	}, fileName);
}

export function useActualExpectedExportOptions({
	shown,
	groups,
	grouping,
	reportTitle,
	teamName
}: Readonly<{
	shown: ActualExpectedShown | null;
	groups: ReadonlyArray<PlanGroup>;
	grouping: PlanGrouping;
	reportTitle: string;
	teamName: string;
}>): ExportOption[] {
	const t = useTranslations();
	const locale = useWorkspaceLocale();

	return useMemo(() => {
		if (!shown) {
			return [];
		}
		const periodText = formatPeriod(shown.period, locale);
		const title = t('dashboard.actualExpected.PDF_TITLE', {
			report: reportTitle,
			team: teamName,
			period: periodText
		});
		const pdfFileName = periodFileNameOf(FILE_PREFIX, shown.period.from, shown.period.to, 'pdf');
		const csvFileName = periodFileNameOf(FILE_PREFIX, shown.period.from, shown.period.to, 'csv');
		const pdfInput: PdfInput = { shown, groups, grouping, title, periodText, locale, t };

		return [
			{
				key: 'pdf',
				label: t('common.PDF'),
				icon: <FilePdf />,
				run: () => downloadPlanPdf(pdfInput, pdfFileName)
			},
			{
				key: 'csv',
				label: t('dashboard.timeActivity.export.CSV'),
				icon: <FileSheet />,
				run: () => {
					const rows = rowsInViewOrder(groups);
					const columns = csvColumnsOf(t);
					downloadCsv(rows, columns, csvFileName);
				}
			}
		];
	}, [groups, grouping, locale, reportTitle, shown, t, teamName]);
}
