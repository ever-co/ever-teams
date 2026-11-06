'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { DollarCircle, Pencil, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { entryFillOf, entryToneStyle, ENTRY_BAR } from './calendar-recipes';

export interface EntryHandlers {
	canEdit: (log: ITimeLog) => boolean;
	onEdit: (log: ITimeLog) => void;
	onDelete: (log: ITimeLog) => void;
}

export function ProjectDot({ color, className }: Readonly<{ color: string | null; className?: string }>) {
	return (
		<span
			aria-hidden="true"
			style={entryToneStyle(color)}
			className={cn('size-2 shrink-0 rounded-full bg-(--entry)', className)}
		/>
	);
}

export function entryRangeTextOf(entry: CalendarEntry, formatters: TimesheetFormatters, runningLabel: string) {
	const startText = formatters.time(entry.start);
	let endText = formatters.time(entry.end);
	if (entry.isRunning) {
		endText = runningLabel;
	}
	return `${startText} – ${endText}`;
}

export function useEntryTitle(entry: CalendarEntry) {
	const t = useTranslations();
	return entry.taskTitle ?? t('dashboard.timesheets.NO_TASK');
}

export function ManualChip() {
	const t = useTranslations();
	return (
		<span className="inline-flex h-5 shrink-0 items-center rounded-md bg-foreground/5 px-1.5 text-[11px] font-medium text-muted-foreground">
			{t('dashboard.calendar.LEGEND.MANUAL')}
		</span>
	);
}

export function ReasonQuote({ reason }: Readonly<{ reason: string | null }>) {
	if (!reason) {
		return null;
	}
	return (
		<p title={reason} className="truncate hairline-l border-border pl-2 text-xs text-muted-foreground">
			{reason}
		</p>
	);
}

export function ProjectLine({ entry }: Readonly<{ entry: CalendarEntry }>) {
	const t = useTranslations();
	if (!entry.projectName) {
		return <span className="truncate text-xs text-muted-foreground">{t('dashboard.timesheets.NO_PROJECT')}</span>;
	}
	return (
		<span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
			<ProjectDot color={entry.projectColor} />
			<span className="truncate">{entry.projectName}</span>
		</span>
	);
}

export function BillableLine({ isBillable }: Readonly<{ isBillable: boolean }>) {
	const t = useTranslations();
	let label = t('dashboard.calendar.NOT_BILLABLE');
	let toneClassName = 'text-muted-foreground';
	if (isBillable) {
		label = t('dashboard.calendar.BILLABLE');
		toneClassName = 'text-foreground';
	}
	return (
		<span className={cn('inline-flex items-center gap-1.5 text-xs', toneClassName)}>
			<DollarCircle aria-hidden="true" className="size-3.5 shrink-0" />
			{label}
		</span>
	);
}

/** Edit and Delete of one entry, only for whoever may change it: the Timesheets page's rule. */
export function EntryActions({
	entry,
	handlers,
	onBeforeAction
}: Readonly<{ entry: CalendarEntry; handlers: EntryHandlers; onBeforeAction?: () => void }>) {
	const t = useTranslations();
	const canEdit = handlers.canEdit(entry.log);
	if (!canEdit) {
		return null;
	}
	const edit = () => {
		onBeforeAction?.();
		handlers.onEdit(entry.log);
	};
	const remove = () => {
		onBeforeAction?.();
		handlers.onDelete(entry.log);
	};
	return (
		<span className="flex shrink-0 items-center gap-1">
			<Button type="button" variant="outline" size="sm" onClick={edit}>
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
		</span>
	);
}

/** One entry in a day's list (the day panel, the phone's day list): range, task over project, duration. */
export const EntryListRow = memo(function EntryListRow({
	entry,
	formatters,
	handlers
}: Readonly<{ entry: CalendarEntry; formatters: TimesheetFormatters; handlers: EntryHandlers }>) {
	const t = useTranslations();
	const title = useEntryTitle(entry);
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const rangeText = entryRangeTextOf(entry, formatters, runningLabel);
	const duration = formatDurationShort(entry.durationSeconds);
	const fill = entryFillOf(entry.isManual);
	const canEdit = handlers.canEdit(entry.log);
	return (
		<li className="flex flex-col gap-2 py-3 [contain-intrinsic-size:auto_72px] [content-visibility:auto]">
			<div className="flex min-w-0 items-start gap-3">
				<span
					aria-hidden="true"
					style={entryToneStyle(entry.projectColor)}
					className={cn('relative mt-0.5 h-9 w-2 shrink-0 overflow-hidden rounded-[3px]', fill)}
				>
					<span className={ENTRY_BAR} />
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-xs tabular-nums text-muted-foreground">{rangeText}</span>
					<span className="truncate text-[13px] font-medium text-foreground">{title}</span>
					<ProjectLine entry={entry} />
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					<span className="text-[13px] font-medium tabular-nums text-foreground">{duration}</span>
					{entry.isManual && <ManualChip />}
				</div>
			</div>
			<ReasonQuote reason={entry.reason} />
			{canEdit && (
				<div className="flex justify-end">
					<EntryActions entry={entry} handlers={handlers} />
				</div>
			)}
		</li>
	);
});
