'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { STATUS_LABEL_KEYS } from '@/core/components/dashboards/timesheets/timesheet-status';
import { FilePdf, FileSheet } from '@/core/components/icons';
import { APP_NAME } from '@/core/constants/config/constants';
import { type CsvColumn, downloadCsv, downloadPdf, periodFileNameOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { clockTimeOf, hoursMinutesOf } from '@/core/lib/utils/dashboards/timesheets';
import {
	clockDateTimeOf,
	type EditsFigures,
	type EditsGroup,
	type ManualTimeEntry
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import type { EditsPdfContent, EditsPdfGroup } from './manual-time-edits-pdf';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'manual-time-edits';

function yesNoOf(value: boolean, t: Translate) {
	if (value) {
		return t('common.YES');
	}
	return t('common.NO');
}

function projectCellOf(entry: ManualTimeEntry, t: Translate) {
	return entry.projectName ?? t('dashboard.timesheets.NO_PROJECT');
}

function taskCellOf(entry: ManualTimeEntry, t: Translate) {
	return entry.taskTitle ?? t('dashboard.timesheets.NO_TASK');
}

function statusCellOf(entry: ManualTimeEntry, t: Translate) {
	if (!entry.status) {
		return '';
	}
	return t(STATUS_LABEL_KEYS[entry.status]);
}

function columnsOf(t: Translate): CsvColumn<ManualTimeEntry>[] {
	return [
		{ header: t('dashboard.timesheets.COLUMNS.DATE'), valueOf: (entry) => entry.dayKey },
		{ header: t('common.MEMBER'), valueOf: (entry) => entry.memberName },
		{ header: t('dashboard.timesheets.COLUMNS.PROJECT'), valueOf: (entry) => projectCellOf(entry, t) },
		{ header: t('dashboard.timesheets.COLUMNS.TASK'), valueOf: (entry) => taskCellOf(entry, t) },
		{ header: t('dashboard.timesheets.COLUMNS.START'), valueOf: (entry) => clockTimeOf(entry.start) },
		{ header: t('dashboard.timesheets.COLUMNS.END'), valueOf: (entry) => clockTimeOf(entry.end) },
		{ header: t('dashboard.timesheets.COLUMNS.DURATION'), valueOf: (entry) => hoursMinutesOf(entry.seconds) },
		{ header: t('dashboard.manualTimeEdits.ADDED'), valueOf: (entry) => yesNoOf(entry.isAdded, t) },
		{
			header: t('dashboard.manualTimeEdits.COLUMN_EDITED_AT'),
			valueOf: (entry) => clockDateTimeOf(entry.editedAt)
		},
		{ header: t('dashboard.timesheets.COLUMNS.BILLABLE'), valueOf: (entry) => yesNoOf(entry.isBillable, t) },
		{ header: t('dashboard.timesheets.COLUMNS.STATUS'), valueOf: (entry) => statusCellOf(entry, t) },
		{ header: t('dashboard.manualTimeEdits.COLUMN_REASON'), valueOf: (entry) => entry.reason ?? '' }
	];
}

function cellTextOf(value: string | number | null | undefined) {
	if (value === null || value === undefined) {
		return '';
	}
	return String(value);
}

function pdfGroupTitleOf(group: EditsGroup, locale: FormatLocale) {
	if (group.member) {
		return group.member.name;
	}
	if (!group.day) {
		return '';
	}
	const format = dateFormatOf(locale, { weekday: 'short', month: 'short', day: 'numeric' });
	return format.format(group.day);
}

function pdfGroupsOf(
	groups: ReadonlyArray<EditsGroup>,
	columns: ReadonlyArray<CsvColumn<ManualTimeEntry>>,
	locale: FormatLocale
): EditsPdfGroup[] {
	return groups.map((group) => ({
		key: group.key,
		title: pdfGroupTitleOf(group, locale),
		total: formatDurationShort(group.seconds),
		rows: group.entries.map((entry) => ({
			key: entry.key,
			cells: columns.map((column) => cellTextOf(column.valueOf(entry)))
		}))
	}));
}

interface ExportInput {
	groups: ReadonlyArray<EditsGroup>;
	figures: EditsFigures;
	period: Period;
	teamName: string;
	locale: FormatLocale;
	t: Translate;
}

function summaryOf(figures: EditsFigures, t: Translate) {
	return [
		{ label: t('dashboard.manualTimeEdits.FIGURE_MANUAL'), value: formatDurationShort(figures.manualSeconds) },
		{ label: t('dashboard.manualTimeEdits.FIGURE_ADDED'), value: formatDurationShort(figures.addedSeconds) },
		{ label: t('dashboard.manualTimeEdits.FIGURE_EDITED'), value: formatDurationShort(figures.editedSeconds) },
		{
			label: t('dashboard.manualTimeEdits.FIGURE_ENTRIES'),
			value: t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: figures.entryCount })
		},
		{ label: t('common.MEMBERS'), value: String(figures.memberCount) }
	];
}

function pdfContentOf({ groups, figures, period, teamName, locale, t }: ExportInput): EditsPdfContent {
	const title = t('dashboard.manualTimeEdits.TITLE');
	const periodText = formatPeriod(period, locale);
	const generatedFormat = dateFormatOf(locale, { dateStyle: 'long' });
	const generatedDate = generatedFormat.format(new Date());
	const columns = columnsOf(t);
	return {
		title,
		period: t('dashboard.manualTimeEdits.PDF_SUBTITLE', { team: teamName, period: periodText }),
		generatedOn: t('dashboard.timeActivity.export.GENERATED_ON', { date: generatedDate }),
		summary: summaryOf(figures, t),
		columns: columns.map((column) => column.header),
		groups: pdfGroupsOf(groups, columns, locale),
		footer: `${APP_NAME} · ${title}`,
		pageLabel: (page, total) => t('dashboard.timeActivity.export.PAGE', { page, total })
	};
}

async function runPdf(input: ExportInput) {
	const content = pdfContentOf(input);
	const fileName = periodFileNameOf(FILE_PREFIX, input.period.from, input.period.to, 'pdf');
	await downloadPdf(async () => {
		const { buildManualTimeEditsPdf } = await import('./manual-time-edits-pdf');
		return buildManualTimeEditsPdf(content);
	}, fileName);
}

function runCsv(input: ExportInput) {
	const rows = input.groups.flatMap((group) => group.entries);
	const columns = columnsOf(input.t);
	const fileName = periodFileNameOf(FILE_PREFIX, input.period.from, input.period.to, 'csv');
	downloadCsv(rows, columns, fileName);
}

export function useManualTimeEditsExportOptions({
	groups,
	figures,
	period,
	teamName
}: Readonly<{
	groups: ReadonlyArray<EditsGroup>;
	figures: EditsFigures;
	period: Period;
	teamName: string;
}>): ExportOption[] {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	return useMemo(() => {
		const input: ExportInput = { groups, figures, period, teamName, locale, t };
		return [
			{
				key: 'csv',
				label: t('dashboard.weeklyLimit.CSV'),
				icon: <FileSheet />,
				run: () => runCsv(input)
			},
			{
				key: 'pdf',
				label: t('common.PDF'),
				icon: <FilePdf />,
				run: () => runPdf(input)
			}
		];
	}, [figures, groups, locale, period, t, teamName]);
}
