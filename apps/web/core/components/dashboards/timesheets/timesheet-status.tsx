'use client';

import { memo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { cn } from '@/core/lib/helpers';
import { ALL_STATUSES, type TimesheetStatusFilter } from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';

export const STATUS_LABEL_KEYS: Record<TimesheetStatusFilter, DottedLanguageObjectStringPaths> = {
	[ALL_STATUSES]: 'dashboard.timesheets.STATUS.ALL',
	[ETimesheetStatus.PENDING]: 'dashboard.timesheets.STATUS.PENDING',
	[ETimesheetStatus.APPROVED]: 'dashboard.timesheets.STATUS.APPROVED',
	[ETimesheetStatus.DENIED]: 'dashboard.timesheets.STATUS.DENIED',
	[ETimesheetStatus.DRAFT]: 'dashboard.timesheets.STATUS.DRAFT',
	[ETimesheetStatus.IN_REVIEW]: 'dashboard.timesheets.STATUS.IN_REVIEW'
};

/**
 * The status glyphs of the task statuses, where the fill tells how far the log went: a dashed ring for a draft, a
 * half disc while it waits, three quarters in review, a full disc with a check or a cross once decided.
 */
const GLYPH_NAMES: Record<ETimesheetStatus, string> = {
	[ETimesheetStatus.DRAFT]: 'backlog',
	[ETimesheetStatus.PENDING]: 'in progress',
	[ETimesheetStatus.IN_REVIEW]: 'in review',
	[ETimesheetStatus.APPROVED]: 'done',
	[ETimesheetStatus.DENIED]: 'canceled'
};

const GLYPH_TONES: Record<ETimesheetStatus, string> = {
	[ETimesheetStatus.DRAFT]: 'text-muted-foreground',
	[ETimesheetStatus.PENDING]: 'text-warning-foreground',
	[ETimesheetStatus.IN_REVIEW]: 'text-info-foreground',
	[ETimesheetStatus.APPROVED]: 'text-success-foreground',
	[ETimesheetStatus.DENIED]: 'text-destructive-ink'
};

const CHIP_TONES: Record<ETimesheetStatus, string> = {
	[ETimesheetStatus.DRAFT]: '[--chip:hsl(var(--muted-foreground))]',
	[ETimesheetStatus.PENDING]: '[--chip:hsl(var(--warning))]',
	[ETimesheetStatus.IN_REVIEW]: '[--chip:hsl(var(--info))]',
	[ETimesheetStatus.APPROVED]: '[--chip:hsl(var(--success))]',
	[ETimesheetStatus.DENIED]: '[--chip:hsl(var(--destructive))]'
};

/** The glyph alone, in its status tone; `inherit` lets a chip give it its own ink. */
export function TimesheetStatusGlyph({
	status,
	inherit = false,
	className
}: Readonly<{ status: ETimesheetStatus; inherit?: boolean; className?: string }>) {
	let tone = GLYPH_TONES[status];
	if (inherit) {
		tone = 'text-current';
	}
	return <TaskPropertyIcon kind="status" name={GLYPH_NAMES[status]} className={cn(tone, className)} />;
}

/** The status assigned to a log, as the app's 3D label in the status tone: glyph and word, never colour alone. */
export const TimesheetStatusChip = memo(function TimesheetStatusChip({
	status,
	className
}: Readonly<{ status: ETimesheetStatus | null; className?: string }>) {
	const t = useTranslations();
	if (!status) {
		return <span className="text-[13px] text-muted-foreground">–</span>;
	}
	return (
		<span
			className={cn(
				'chip-3d inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium',
				CHIP_TONES[status],
				className
			)}
		>
			<TimesheetStatusGlyph status={status} inherit className="size-3.5" />
			<span className="truncate">{t(STATUS_LABEL_KEYS[status])}</span>
		</span>
	);
});

const DOT_TONES: Record<ETimesheetStatus, string> = {
	[ETimesheetStatus.DRAFT]: 'bg-muted-foreground',
	[ETimesheetStatus.PENDING]: 'bg-warning',
	[ETimesheetStatus.IN_REVIEW]: 'bg-info',
	[ETimesheetStatus.APPROVED]: 'bg-success',
	[ETimesheetStatus.DENIED]: 'bg-destructive'
};

/** Inside a menu the colour rides on a dot beside the written status (the menus mute their icons). */
export function TimesheetStatusDot({ status }: Readonly<{ status: ETimesheetStatus }>) {
	return (
		<span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
			<span className={cn('size-2 rounded-full', DOT_TONES[status])} />
		</span>
	);
}
