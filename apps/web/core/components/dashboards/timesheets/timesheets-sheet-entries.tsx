'use client';

import { useTranslations } from 'next-intl';
import { Popover, PopoverContent } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { Check, Info, Pencil, Trash, X } from '@/core/components/icons';
import type { SheetCellTarget } from '@/core/hooks/dashboards/timesheets/use-timesheet-sheet';
import { canEditLog, type TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	isPendingLog,
	logDurationSeconds,
	type SheetCell,
	type SheetDay,
	type SheetRow,
	statusOfLog,
	type TimesheetFormatters,
	timeRangeTextOf,
	type WeekSheet
} from '@/core/lib/utils/dashboards/timesheets';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { type TimeEntryReuseHandlers, TimeEntryReuseButtons } from './time-entry-reuse';
import { dayLabelOf } from './timesheet-day-label';
import { LogChangeChips, ManualReasonLine } from './timesheet-log-changes';
import { LOG_TYPE_LABEL_KEYS, rejectionReasonOf, type TimesheetRowHandlers } from './timesheet-log-row';
import { TimesheetStatusChip } from './timesheet-status';

const META_SEPARATOR = ' · ';

interface OpenEntries {
	row: SheetRow;
	cell: SheetCell;
	day: SheetDay;
	anchor: HTMLElement;
}

function openEntriesOf(
	target: SheetCellTarget | null,
	sheet: WeekSheet,
	days: ReadonlyArray<SheetDay>
): OpenEntries | null {
	if (!target) {
		return null;
	}
	const row = sheet.rows.find((candidate) => candidate.key === target.rowKey);
	if (!row) {
		return null;
	}
	const cell = row.cells.get(target.dayKey);
	if (!cell) {
		return null;
	}
	const day = days.find((candidate) => candidate.key === target.dayKey);
	if (!day) {
		return null;
	}
	return { row, cell, day, anchor: target.anchor };
}

function canReviewLog(log: ITimeLog, permissions: TimesheetPermissions) {
	const isPending = isPendingLog(log);
	return isPending && permissions.canApprove;
}

function offersReuse(log: ITimeLog, reuse: TimeEntryReuseHandlers | undefined) {
	if (!reuse) {
		return false;
	}
	return reuse.canContinue(log) || reuse.canDuplicate(log);
}

function EntryMeta({ log, formatters }: Readonly<{ log: ITimeLog; formatters: TimesheetFormatters }>) {
	const t = useTranslations();
	const timeRange = timeRangeTextOf(log, formatters, t('dashboard.timesheets.RUNNING'));
	const parts = [timeRange];
	const logType = log.logType ?? ETimeLogType.TRACKED;
	const logTypeKey = LOG_TYPE_LABEL_KEYS[logType];
	if (logTypeKey) {
		parts.push(t(logTypeKey));
	}
	if (log.isBillable) {
		parts.push(t('dashboard.timesheets.BILLABLE'));
	}
	const text = parts.join(META_SEPARATOR);
	return <span className="min-w-0 truncate text-[13px] tabular-nums text-foreground">{text}</span>;
}

function SheetEntry({
	log,
	formatters,
	permissions,
	handlers,
	onAct
}: Readonly<{
	log: ITimeLog;
	formatters: TimesheetFormatters;
	permissions: TimesheetPermissions;
	handlers: TimesheetRowHandlers;
	/** Closes the popover before an action, so a dialog never opens under it. */
	onAct: () => void;
}>) {
	const t = useTranslations();
	const status = statusOfLog(log);
	const showsReview = canReviewLog(log, permissions);
	const canEdit = canEditLog(log, permissions);
	const reuse = handlers.reuse;
	const showsReuse = offersReuse(log, reuse);
	const hasActions = showsReview || canEdit || showsReuse;
	const seconds = logDurationSeconds(log);
	const duration = formatDurationShort(seconds);
	const rejectionReason = rejectionReasonOf(log, status);

	const approve = () => {
		onAct();
		handlers.approve(log);
	};
	const reject = () => {
		onAct();
		handlers.reject(log);
	};
	const edit = () => {
		onAct();
		handlers.edit(log);
	};
	const remove = () => {
		onAct();
		handlers.remove(log);
	};

	return (
		<li className="flex flex-col gap-1.5 px-3.5 py-2.5">
			<span className="flex items-baseline justify-between gap-3">
				<EntryMeta log={log} formatters={formatters} />
				<span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">{duration}</span>
			</span>
			<span className="flex flex-wrap items-center gap-1.5">
				<TimesheetStatusChip status={status} className="h-5 px-1.5" />
				<LogChangeChips log={log} formatters={formatters} />
			</span>
			<ManualReasonLine log={log} />
			{rejectionReason && (
				<span className="truncate text-xs text-destructive-ink">
					{t('dashboard.timesheets.REJECTION_REASON', { reason: rejectionReason })}
				</span>
			)}
			{hasActions && (
				<span className="flex flex-wrap items-center gap-1 pt-0.5">
					{showsReview && (
						<>
							<Button type="button" variant="default" size="sm" onClick={approve}>
								<Check />
								<span>{t('dashboard.timesheets.APPROVE')}</span>
							</Button>
							<Button type="button" variant="outline" size="sm" onClick={reject}>
								<X />
								<span>{t('dashboard.timesheets.REJECT')}</span>
							</Button>
						</>
					)}
					{reuse && <TimeEntryReuseButtons log={log} reuse={reuse} onAct={onAct} />}
					{canEdit && (
						<>
							<Button type="button" variant="ghost" size="sm" onClick={edit}>
								<Pencil />
								<span>{t('common.EDIT')}</span>
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={remove}
								className="text-destructive-ink hover:bg-destructive/10 hover:text-destructive-ink"
							>
								<Trash />
								<span>{t('common.DELETE')}</span>
							</Button>
						</>
					)}
				</span>
			)}
		</li>
	);
}

function taskTitleOf(row: SheetRow, fallback: string) {
	const title = row.sample.task?.title;
	if (title) {
		return title;
	}
	return fallback;
}

function finalFocusOf(anchor: HTMLElement | undefined) {
	if (!anchor) {
		return undefined;
	}
	return () => anchor;
}

/**
 * The entries of one sheet cell, in one popover shared by the whole sheet and anchored to the cell that opened it:
 * each log with its time range, duration, status, Added and Edited chips and typed reason, and what may be done
 * with it. Approve applies at once; Reject, Edit and Delete open the page's existing dialogs.
 */
export function TimesheetsSheetEntries({
	sheet,
	days,
	openCell,
	isOpen,
	onClose,
	formatters,
	permissions,
	handlers
}: Readonly<{
	sheet: WeekSheet;
	days: ReadonlyArray<SheetDay>;
	openCell: SheetCellTarget | null;
	isOpen: boolean;
	onClose: () => void;
	formatters: TimesheetFormatters;
	permissions: TimesheetPermissions;
	handlers: TimesheetRowHandlers;
}>) {
	const t = useTranslations();
	const entries = openEntriesOf(openCell, sheet, days);
	const hasEntries = Boolean(entries);
	const isShown = isOpen && hasEntries;

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			onClose();
		}
	};

	let content = null;
	if (entries) {
		const taskTitle = taskTitleOf(entries.row, t('dashboard.timesheets.NO_TASK'));
		const dayLabel = dayLabelOf(entries.day.date, t, formatters);
		const cellTotal = formatDurationShort(entries.cell.seconds);
		const logCount = t('dashboard.timesheets.LOG_COUNT', { count: entries.cell.logs.length });
		const offersReview = entries.cell.logs.some((log) => canReviewLog(log, permissions));
		content = (
			<>
				<div className="flex items-start justify-between gap-3 px-3.5 pt-3 pb-1">
					<div className="flex min-w-0 flex-col gap-0.5">
						<p className="truncate text-[13px] font-medium text-foreground">{taskTitle}</p>
						<p className="truncate text-xs text-muted-foreground">
							{dayLabel}
							{META_SEPARATOR}
							{logCount}
						</p>
					</div>
					<span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{cellTotal}</span>
				</div>
				<ul className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain">
					{entries.cell.logs.map((log) => (
						<SheetEntry
							key={log.id}
							log={log}
							formatters={formatters}
							permissions={permissions}
							handlers={handlers}
							onAct={onClose}
						/>
					))}
				</ul>
				{offersReview && (
					<p className="flex items-start gap-1.5 px-3.5 pt-1 pb-3 text-xs text-muted-foreground">
						<Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
						<span>{t('dashboard.timesheets.SHEET.WHOLE_TIMESHEETS')}</span>
					</p>
				)}
			</>
		);
	}

	return (
		<Popover open={isShown} onOpenChange={handleOpenChange}>
			<PopoverContent
				anchor={entries?.anchor}
				side="bottom"
				align="center"
				collisionPadding={8}
				finalFocus={finalFocusOf(entries?.anchor)}
				aria-label={t('dashboard.timesheets.SHEET.ENTRIES_LABEL')}
				className="w-80 max-w-[calc(100vw-1rem)] p-0"
			>
				{content}
			</PopoverContent>
		</Popover>
	);
}
