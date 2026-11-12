'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_SURFACE, SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import { TimesheetsDeleteDialog } from '@/core/components/dashboards/timesheets/timesheets-dialogs';
import {
	type SheetEntryHandlers,
	TimesheetsSheetEntries
} from '@/core/components/dashboards/timesheets/timesheets-sheet-entries';
import {
	copyWeekOf,
	EmptySheetHint,
	SHEET_HEADER,
	SheetCopyConfirmDialog,
	SheetEditNotice,
	SheetHeader
} from '@/core/components/dashboards/timesheets/timesheets-sheet-tools';
import {
	TimesheetsWeekSheet,
	TimesheetsWeekSheetSkeleton
} from '@/core/components/dashboards/timesheets/timesheets-week-sheet';
import type { SheetEditingSource } from '@/core/hooks/dashboards/timesheets/use-sheet-editing';
import type { WorkDiaryPageState } from '@/core/hooks/dashboards/work-diary/use-work-diary-page';
import { useWorkDiaryWeekSheet } from '@/core/hooks/dashboards/work-diary/use-work-diary-week-sheet';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';

const NO_ENTRY_ACTIONS: SheetEntryHandlers = {};

function WeekTitle({ title }: Readonly<{ title: string }>) {
	return <h2 className={SECTION_TITLE}>{title}</h2>;
}

/** The week block before its sheet is there: the same surface and header line, so nothing moves when it arrives. */
function WeekFrame({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
	return (
		<section aria-label={title} className={DASHBOARD_SURFACE}>
			<div className={SHEET_HEADER}>
				<WeekTitle title={title} />
			</div>
			{children}
		</section>
	);
}

function DiaryWeekSheet({
	source,
	title,
	periodText
}: Readonly<{ source: SheetEditingSource; title: string; periodText: string }>) {
	const t = useTranslations();
	const week = useWorkDiaryWeekSheet(source);
	const { sheet, editing, formatters, canDeleteOpenEntries, askToDeleteEntry } = week;
	const member = sheet.member;
	let memberName: string = t('dashboard.timesheets.SHEET.UNNAMED_MEMBER');
	if (member?.name) {
		memberName = member.name;
	}
	const copyWeek = copyWeekOf(editing);
	const hasRows = sheet.sheet.rows.length > 0;
	const hasDraftRows = editing.draftRows.length > 0;
	const isEmpty = !hasRows && !hasDraftRows;
	// Until the permissions are read the sheet cannot tell a week to fill from a read-only one
	const isLockKnown = editing.sheetLock !== 'loading';
	const showsEmptyHint = isEmpty && isLockKnown;
	const entryHandlers = useMemo<SheetEntryHandlers>(() => {
		if (!canDeleteOpenEntries) {
			return NO_ENTRY_ACTIONS;
		}
		return { remove: askToDeleteEntry };
	}, [askToDeleteEntry, canDeleteOpenEntries]);
	const emptyMessage = (
		<BlockEmptyMessage
			title={t('dashboard.calendar.EMPTY_PERIOD', { period: periodText })}
			message={t('dashboard.calendar.EMPTY_MESSAGE')}
		/>
	);

	return (
		<section aria-label={title} className={DASHBOARD_SURFACE}>
			<SheetHeader
				lead={<WeekTitle title={title} />}
				sheet={sheet.sheet}
				status={member?.status ?? null}
				copyWeek={copyWeek}
			/>
			<SheetEditNotice
				lock={editing.sheetLock}
				permissionMessage={t('dashboard.workDiary.WEEK_NO_MANUAL_TIME_PERMISSION')}
			/>
			<TimesheetsWeekSheet
				days={sheet.days}
				sheet={sheet.sheet}
				memberName={memberName}
				formatters={formatters}
				openCell={sheet.openCell}
				isCellOpen={sheet.isCellOpen}
				editing={editing}
				onOpenCell={sheet.openCellEntries}
			/>
			{showsEmptyHint && <EmptySheetHint editing={editing} fallback={emptyMessage} />}
			<TimesheetsSheetEntries
				sheet={sheet.sheet}
				days={sheet.days}
				openCell={sheet.openCell}
				isOpen={sheet.isCellOpen}
				onClose={sheet.closeCellEntries}
				formatters={formatters}
				permissions={week.permissions}
				handlers={entryHandlers}
			/>
			<SheetCopyConfirmDialog copyWeek={editing.copyWeek} />
			<TimesheetsDeleteDialog
				dialogs={week.dialogs}
				isDeleting={week.isDeleting}
				onDeleteConfirmed={week.confirmDelete}
			/>
		</section>
	);
}

/**
 * The Week view of the Work diary: the signed-in member's own week on the sheet of Timesheets, one row per project
 * and task and one column per day, typed in under the sheet's own rules. It shows no other member and none of the
 * approval tools, which stay in Reports › Timesheets.
 */
export function DiaryWeekView({ page }: Readonly<{ page: WorkDiaryPageState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { weekSheet } = page;
	const title = t('dashboard.workDiary.WEEK_TITLE');

	if (weekSheet.isLoading) {
		return (
			<WeekFrame title={title}>
				<TimesheetsWeekSheetSkeleton />
			</WeekFrame>
		);
	}
	if (weekSheet.isError) {
		return (
			<WeekFrame title={title}>
				<div className="p-4">
					<DashboardErrorNotice onRetry={() => void weekSheet.refetch()} />
				</div>
			</WeekFrame>
		);
	}
	const periodText = formatPeriod(page.week, locale);
	return <DiaryWeekSheet source={weekSheet.source} title={title} periodText={periodText} />;
}
