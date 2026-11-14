'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { EntriesPdfContent, EntriesPdfGroup } from '@/core/components/dashboards/kit/entries-pdf';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import {
	HISTORY_FIELD_LABEL_KEYS,
	historyValueFormatOf,
	type MemberNameOf
} from '@/core/components/dashboards/timesheets/time-log-history';
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
	type EditsMember,
	type ManualTimeEntry,
	pdfDateTimeOf,
	pdfDayOf
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { changeSideTextOf, type HistoryValueFormat } from '@/core/lib/utils/time-log-history';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'manual-time-edits';

/**
 * Date, member, project, task, start, end, duration, added, edited at, before, after, billable, status, reason: the
 * widths of the export columns on a landscape page, in that order.
 */
const PDF_COLUMN_WIDTHS = ['6%', '8%', '8%', '11%', '4%', '4%', '5%', '4%', '8%', '10%', '10%', '4%', '6%', '12%'];

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

type EntryText = (entry: ManualTimeEntry) => string;

/** The values of the last edit, written like the other cells: a start or an end with its day, and hours:minutes. */
function fileValueFormatOf(t: Translate, memberNameOf: MemberNameOf, moment: DateText): HistoryValueFormat {
	const format = historyValueFormatOf(t, moment, memberNameOf);
	return { ...format, duration: hoursMinutesOf };
}

/** Before and after of the entry's last edit; a deleted entry is the row itself, then "Deleted". */
function changeCellsOf(t: Translate, memberNameOf: MemberNameOf, moment: DateText) {
	const format = fileValueFormatOf(t, memberNameOf, moment);
	const labelOf = (field: keyof typeof HISTORY_FIELD_LABEL_KEYS) => t(HISTORY_FIELD_LABEL_KEYS[field]);
	const updateOf = (entry: ManualTimeEntry) => {
		const change = entry.lastChange;
		const isUpdate = change?.action === 'updated';
		if (!change || !isUpdate) {
			return null;
		}
		return change;
	};
	return {
		before: (entry: ManualTimeEntry) => {
			const change = updateOf(entry);
			if (!change) {
				return '';
			}
			return changeSideTextOf(change, 'before', format, labelOf);
		},
		after: (entry: ManualTimeEntry) => {
			if (entry.isDeleted) {
				return t('dashboard.manualTimeEdits.DELETED');
			}
			const change = updateOf(entry);
			if (!change) {
				return '';
			}
			return changeSideTextOf(change, 'after', format, labelOf);
		}
	};
}

type DateText = (date: Date) => string;

interface DateCells {
	day: EntryText;
	editedAt: EntryText;
	/** A start or an end in the Before and After cells: an edit can move an entry to another day. */
	moment: DateText;
}

/** A file read by a spreadsheet keeps both as data it can sort, whatever the workspace's date format. */
const FILE_DATE_CELLS: DateCells = {
	day: (entry) => entry.dayKey,
	editedAt: (entry) => clockDateTimeOf(entry.editedAt),
	moment: (date) => clockDateTimeOf(date)
};

function pdfDateCellsOf(locale: FormatLocale): DateCells {
	return {
		day: (entry) => pdfDayOf(entry.day, locale),
		editedAt: (entry) => pdfDateTimeOf(entry.editedAt, locale),
		moment: (date) => pdfDateTimeOf(date, locale)
	};
}

function columnsOf(t: Translate, dates: DateCells, memberNameOf: MemberNameOf): CsvColumn<ManualTimeEntry>[] {
	const changeCells = changeCellsOf(t, memberNameOf, dates.moment);
	return [
		{ header: t('dashboard.timesheets.COLUMNS.DATE'), valueOf: dates.day },
		{ header: t('common.MEMBER'), valueOf: (entry) => entry.memberName },
		{ header: t('dashboard.timesheets.COLUMNS.PROJECT'), valueOf: (entry) => projectCellOf(entry, t) },
		{ header: t('dashboard.timesheets.COLUMNS.TASK'), valueOf: (entry) => taskCellOf(entry, t) },
		{ header: t('dashboard.timesheets.COLUMNS.START'), valueOf: (entry) => clockTimeOf(entry.start) },
		{ header: t('dashboard.timesheets.COLUMNS.END'), valueOf: (entry) => clockTimeOf(entry.end) },
		{ header: t('dashboard.timesheets.COLUMNS.DURATION'), valueOf: (entry) => hoursMinutesOf(entry.seconds) },
		{ header: t('dashboard.manualTimeEdits.ADDED'), valueOf: (entry) => yesNoOf(entry.isAdded, t) },
		{ header: t('dashboard.manualTimeEdits.COLUMN_EDITED_AT'), valueOf: dates.editedAt },
		{ header: t('dashboard.manualTimeEdits.COLUMN_BEFORE'), valueOf: changeCells.before },
		{ header: t('dashboard.manualTimeEdits.COLUMN_AFTER'), valueOf: changeCells.after },
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
): EntriesPdfGroup[] {
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
	memberNameOf: MemberNameOf;
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

function pdfContentOf({ groups, figures, period, teamName, locale, t, memberNameOf }: ExportInput): EntriesPdfContent {
	const title = t('dashboard.manualTimeEdits.TITLE');
	const periodText = formatPeriod(period, locale);
	const generatedFormat = dateFormatOf(locale, { dateStyle: 'long' });
	const generatedDate = generatedFormat.format(new Date());
	const columns = columnsOf(t, pdfDateCellsOf(locale), memberNameOf);
	return {
		title,
		period: t('dashboard.manualTimeEdits.PDF_SUBTITLE', { team: teamName, period: periodText }),
		generatedOn: t('dashboard.timeActivity.export.GENERATED_ON', { date: generatedDate }),
		summary: summaryOf(figures, t),
		columns: columns.map((column) => column.header),
		columnWidths: PDF_COLUMN_WIDTHS,
		groups: pdfGroupsOf(groups, columns, locale),
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

function runCsv(input: ExportInput) {
	const rows = input.groups.flatMap((group) => group.entries);
	const columns = columnsOf(input.t, FILE_DATE_CELLS, input.memberNameOf);
	const fileName = periodFileNameOf(FILE_PREFIX, input.period.from, input.period.to, 'csv');
	downloadCsv(rows, columns, fileName);
}

function memberNamesOf(members: ReadonlyArray<EditsMember>): MemberNameOf {
	const names = new Map<string, string>();
	for (const member of members) {
		names.set(member.employeeId, member.name);
	}
	return (employeeId) => names.get(employeeId) ?? null;
}

export function useManualTimeEditsExportOptions({
	groups,
	figures,
	period,
	teamName,
	members
}: Readonly<{
	groups: ReadonlyArray<EditsGroup>;
	figures: EditsFigures;
	period: Period;
	teamName: string;
	members: ReadonlyArray<EditsMember>;
}>): ExportOption[] {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	return useMemo(() => {
		const memberNameOf = memberNamesOf(members);
		const input: ExportInput = { groups, figures, period, teamName, locale, t, memberNameOf };
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
	}, [figures, groups, locale, members, period, t, teamName]);
}
