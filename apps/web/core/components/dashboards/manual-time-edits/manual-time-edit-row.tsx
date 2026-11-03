'use client';

import { memo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { TimesheetStatusChip } from '@/core/components/dashboards/timesheets/timesheet-status';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { DollarCircle, MoreHorizontal, Pencil, PlusCircle, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	capitalizedOf,
	relativeDayOf,
	type TimesheetFormatters,
	timeRangeTextOf
} from '@/core/lib/utils/dashboards/timesheets';
import {
	type EditsGrouping,
	type ManualTimeEntry,
	relativeTimeTextOf
} from '@/core/lib/utils/dashboards/manual-time-edits';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { EDITS_GRID, EDITS_ROW, NARROW_ONLY, WIDE_ONLY } from './manual-time-edits-grid';

type Translate = ReturnType<typeof useTranslations>;

export interface EditsFormatters extends TimesheetFormatters {
	editedAt: (date: Date) => string;
}

export interface EditRowHandlers {
	toggleEntry: (entryId: string) => void;
	edit: (log: ITimeLog) => void;
	remove: (log: ITimeLog) => void;
}

const CHANGE_CHIP =
	'inline-flex h-5.5 shrink-0 items-center gap-1 rounded-md bg-card px-1.5 text-xs font-medium text-foreground hairline-ring ring-border [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

const META_SEPARATOR = ' · ';

function dayNameOf(day: Date, locale: string, t: Translate, formatters: TimesheetFormatters) {
	const relative = relativeDayOf(day);
	if (relative === 'today') {
		return t('common.TODAY');
	}
	if (relative === 'yesterday') {
		return t('common.YESTERDAY');
	}
	const weekday = formatters.weekdayShort(day);
	return capitalizedOf(weekday, locale);
}

export function DayName({
	day,
	formatters,
	className
}: Readonly<{ day: Date; formatters: TimesheetFormatters; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const name = dayNameOf(day, locale, t, formatters);
	const date = formatters.dayDate(day);
	return (
		<span className={cn('min-w-0 truncate tabular-nums', className)}>
			{t.rich('dashboard.manualTimeEdits.DAY_LABEL', {
				day: name,
				date,
				strong: (chunks) => <span className="font-semibold">{chunks}</span>
			})}
		</span>
	);
}

/** "Edited Nov 4, 10:12 · 2 days ago": Gauzy keeps when a log was last edited, never what it was before. */
export function editedWhenOf(entry: ManualTimeEntry, locale: string, formatters: EditsFormatters) {
	const editedAt = entry.editedAt;
	if (!editedAt) {
		return null;
	}
	const absolute = formatters.editedAt(editedAt);
	const relative = relativeTimeTextOf(editedAt, locale);
	return [absolute, relative].join(META_SEPARATOR);
}

export function ChangeChips({
	entry,
	formatters,
	className
}: Readonly<{ entry: ManualTimeEntry; formatters: EditsFormatters; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const editedWhen = editedWhenOf(entry, locale, formatters);
	let editedTitle: string | undefined;
	if (editedWhen) {
		editedTitle = t('dashboard.manualTimeEdits.EDITED_AT', { when: editedWhen });
	}
	return (
		<span className={cn('flex min-w-0 flex-wrap items-center gap-1', className)}>
			{entry.isAdded && (
				<span className={CHANGE_CHIP}>
					<PlusCircle aria-hidden="true" />
					<span>{t('dashboard.manualTimeEdits.ADDED')}</span>
				</span>
			)}
			{entry.isEdited && (
				<span className={CHANGE_CHIP} title={editedTitle}>
					<Pencil aria-hidden="true" />
					<span>{t('dashboard.manualTimeEdits.EDITED')}</span>
					{editedWhen && <span className="sr-only">{editedWhen}</span>}
				</span>
			)}
		</span>
	);
}

function ProjectChip({ entry, className }: Readonly<{ entry: ManualTimeEntry; className?: string }>) {
	const t = useTranslations();
	const projectName = entry.projectName;
	if (!projectName) {
		return (
			<span className={cn('truncate text-xs text-muted-foreground', className)}>
				{t('dashboard.timesheets.NO_PROJECT')}
			</span>
		);
	}
	const color = entry.projectColor ?? undefined;
	const hasColor = Boolean(color);
	return (
		<span className={cn('flex min-w-0 items-center gap-1.5 text-xs text-foreground', className)}>
			<span
				aria-hidden="true"
				className={cn('size-2 shrink-0 rounded-full', !hasColor && 'bg-foreground/25')}
				style={{ backgroundColor: color }}
			/>
			<span className="truncate">{projectName}</span>
		</span>
	);
}

function TaskTitle({ entry }: Readonly<{ entry: ManualTimeEntry }>) {
	const t = useTranslations();
	const taskId = entry.log.task?.id ?? entry.log.taskId;
	const title = entry.taskTitle;
	if (!taskId || !title) {
		return <span className="truncate text-muted-foreground">{t('dashboard.timesheets.NO_TASK')}</span>;
	}
	return (
		<TaskDrawerLink
			taskId={taskId}
			prefetch={false}
			className="truncate rounded-sm text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			{title}
		</TaskDrawerLink>
	);
}

function ReasonLine({ reason }: Readonly<{ reason: string }>) {
	return (
		<span title={reason} className="block truncate hairline-l border-border pl-2 text-xs text-muted-foreground">
			{reason}
		</span>
	);
}

function billableToneOf(isBillable: boolean) {
	if (isBillable) {
		return 'bg-primary/10 text-primary-ink';
	}
	return 'text-muted-foreground/45';
}

function billableLabelKeyOf(isBillable: boolean) {
	if (isBillable) {
		return 'dashboard.manualTimeEdits.BILLABLE' as const;
	}
	return 'dashboard.manualTimeEdits.NOT_BILLABLE' as const;
}

export function BillableMark({ isBillable }: Readonly<{ isBillable: boolean }>) {
	const t = useTranslations();
	const label = t(billableLabelKeyOf(isBillable));
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={cn('inline-flex size-5 items-center justify-center rounded-full', billableToneOf(isBillable))}
		>
			<DollarCircle aria-hidden="true" className="size-4" />
		</span>
	);
}

export function EntryMenu({
	entry,
	handlers
}: Readonly<{ entry: ManualTimeEntry; handlers: Pick<EditRowHandlers, 'edit' | 'remove'> }>) {
	const t = useTranslations();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t('common.MORE_OPTIONS')}
					className="text-muted-foreground"
				>
					<MoreHorizontal />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-40">
				<DropdownMenuItem onClick={() => handlers.edit(entry.log)}>
					<Pencil />
					<span>{t('common.EDIT')}</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onClick={() => handlers.remove(entry.log)}>
					<Trash />
					<span>{t('common.DELETE')}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function LeadCell({
	entry,
	grouping,
	formatters,
	className
}: Readonly<{
	entry: ManualTimeEntry;
	grouping: EditsGrouping;
	formatters: TimesheetFormatters;
	className?: string;
}>) {
	if (grouping === 'member') {
		return <DayName day={entry.day} formatters={formatters} className={cn('text-[13px]', className)} />;
	}
	return <MemberCell name={entry.memberName} imageUrl={entry.memberImageUrl} className={className} />;
}

function NarrowLeadText({
	entry,
	grouping,
	formatters
}: Readonly<{ entry: ManualTimeEntry; grouping: EditsGrouping; formatters: TimesheetFormatters }>) {
	if (grouping === 'member') {
		return <DayName day={entry.day} formatters={formatters} />;
	}
	return <span className="min-w-0 truncate">{entry.memberName}</span>;
}

export const ManualTimeEditRow = memo(function ManualTimeEditRow({
	entry,
	grouping,
	isSelected,
	canEdit,
	formatters,
	handlers
}: Readonly<{
	entry: ManualTimeEntry;
	grouping: EditsGrouping;
	isSelected: boolean;
	canEdit: boolean;
	formatters: EditsFormatters;
	handlers: EditRowHandlers;
}>) {
	const t = useTranslations();
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const timeRange = timeRangeTextOf(entry.log, formatters, runningLabel);
	const duration = formatDurationShort(entry.seconds);
	const taskName = entry.taskTitle ?? t('dashboard.timesheets.NO_TASK');
	const reason = entry.reason;

	return (
		<div
			role="row"
			aria-selected={isSelected}
			className={cn(
				EDITS_GRID,
				EDITS_ROW,
				'py-1.5 hover:bg-foreground/[0.02]',
				isSelected && 'bg-primary/[0.04] hover:bg-primary/[0.06]'
			)}
		>
			<span role="cell" className="flex items-center">
				{canEdit && (
					<Checkbox
						checked={isSelected}
						onCheckedChange={() => handlers.toggleEntry(entry.key)}
						aria-label={t('dashboard.timesheets.SELECT_LOG', { task: taskName })}
					/>
				)}
			</span>
			<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
				<LeadCell entry={entry} grouping={grouping} formatters={formatters} />
			</span>
			<span role="cell" className="flex min-w-0 flex-col gap-0.5">
				<span className="flex min-w-0 items-center text-[13px]">
					<TaskTitle entry={entry} />
				</span>
				<ProjectChip entry={entry} className={WIDE_ONLY} />
				{reason && <ReasonLine reason={reason} />}
				<span
					className={cn(
						'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground',
						NARROW_ONLY
					)}
				>
					<ChangeChips entry={entry} formatters={formatters} />
					<span className="shrink-0 tabular-nums">{timeRange}</span>
					<NarrowLeadText entry={entry} grouping={grouping} formatters={formatters} />
				</span>
			</span>
			<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
				<ChangeChips entry={entry} formatters={formatters} />
			</span>
			<span role="cell" className={cn('truncate text-[13px] tabular-nums text-muted-foreground', WIDE_ONLY)}>
				{timeRange}
			</span>
			<span role="cell" className="text-right text-[13px] font-medium tabular-nums text-foreground">
				{duration}
			</span>
			<span role="cell" className={cn('flex items-center justify-center', WIDE_ONLY)}>
				<BillableMark isBillable={entry.isBillable} />
			</span>
			<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
				<TimesheetStatusChip status={entry.status} />
			</span>
			<span role="cell" className="flex items-center justify-end">
				{canEdit && <EntryMenu entry={entry} handlers={handlers} />}
			</span>
		</div>
	);
});
