'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { badgeVariants } from '@/core/components/common/badge';
import { Checkbox } from '@/core/components/common/checkbox';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { ChevronRight } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import { statusOfLog, type TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { entryNotesOf } from '@/core/lib/utils/timer/timer-notes';
import { EntryNotesLine } from './timesheet-log-changes';
import { ProjectName, TaskTitle, taskNumberOf } from './timesheet-log-row';
import { TimesheetStatusChip } from './timesheet-status';
import { logGridOf, NARROW_ONLY, WIDE_ONLY } from './timesheets-grid';

const COUNT_CHIP = cn(badgeVariants({ variant: 'outline' }), 'h-5 shrink-0 px-1.5 tabular-nums text-muted-foreground');

interface GroupSelection {
	isChecked: boolean;
	isPartial: boolean;
}

function groupSelectionOf(group: TimesheetEntryGroup, selectedIdSet: ReadonlySet<string>): GroupSelection {
	let selectedCount = 0;
	for (const log of group.logs) {
		if (selectedIdSet.has(log.id)) {
			selectedCount += 1;
		}
	}
	const isChecked = selectedCount === group.logs.length;
	const hasSome = selectedCount > 0;
	const isPartial = hasSome && !isChecked;
	return { isChecked, isPartial };
}

/** "09:12 – 17:30", from the first start of the group to its last end, or to "now" while one of its entries runs. */
function groupTimeRangeOf(group: TimesheetEntryGroup, formatters: TimesheetFormatters, runningLabel: string) {
	if (!group.firstStart) {
		return '–';
	}
	const startText = formatters.time(group.firstStart);
	let endText = runningLabel;
	if (group.lastEnd) {
		endText = formatters.time(group.lastEnd);
	}
	return `${startText} – ${endText}`;
}

/**
 * The one row of a day's entries that record the same work: the task once with the number of its entries, the time
 * from the first start to the last end, and the total. The control before the task opens the entries under the row;
 * the checkbox selects them all for the selection's actions.
 */
export function TimesheetEntryGroupRow({
	group,
	isOpen,
	onToggle,
	selectedIdSet,
	onSelect,
	showsMember,
	formatters,
	menu
}: Readonly<{
	group: TimesheetEntryGroup;
	isOpen: boolean;
	onToggle: (groupKey: string) => void;
	selectedIdSet: ReadonlySet<string>;
	onSelect: (logIds: string[], shouldSelect: boolean) => void;
	showsMember: boolean;
	formatters: TimesheetFormatters;
	menu: ReactNode;
}>) {
	const t = useTranslations();
	const [firstLog] = group.logs;
	const status = statusOfLog(firstLog);
	const selection = groupSelectionOf(group, selectedIdSet);
	const logIds = group.logs.map((log) => log.id);
	const count = group.logs.length;
	const taskName = firstLog.task?.title ?? t('dashboard.timesheets.NO_TASK');
	const taskNumber = taskNumberOf(firstLog);
	const hasTask = Boolean(firstLog.task);
	const countText = t('dashboard.timesheets.SIMILAR.ENTRY_COUNT', { count });
	const timeRange = groupTimeRangeOf(group, formatters, t('dashboard.timesheets.RUNNING'));
	const total = formatDurationShort(group.totalSeconds);
	const memberName = firstLog.employee?.fullName ?? '';
	const hasNotes = Boolean(entryNotesOf(firstLog));
	let toggleLabel = t('dashboard.timesheets.SIMILAR.SHOW_ENTRIES', { task: taskName });
	if (isOpen) {
		toggleLabel = t('dashboard.timesheets.SIMILAR.HIDE_ENTRIES', { task: taskName });
	}

	return (
		<div
			role="row"
			aria-selected={selection.isChecked}
			className={cn(logGridOf(showsMember), 'min-h-11 py-1.5', selection.isChecked && 'bg-foreground/[0.03]')}
		>
			<span role="cell" className="flex items-center">
				<Checkbox
					checked={selection.isChecked}
					indeterminate={selection.isPartial}
					onCheckedChange={(checked) => onSelect(logIds, checked)}
					aria-label={t('dashboard.timesheets.SIMILAR.SELECT_GROUP', { count, task: taskName })}
				/>
			</span>
			<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
				<TimesheetStatusChip status={status} />
			</span>
			<span role="cell" className="flex min-w-0 flex-col gap-0.5 py-0.5">
				<span className="flex min-w-0 items-center gap-1.5 text-[13px]">
					<button
						type="button"
						aria-expanded={isOpen}
						aria-label={toggleLabel}
						onClick={() => onToggle(group.key)}
						className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						<ChevronRight
							aria-hidden="true"
							className={cn('size-4 transition-transform duration-200', isOpen && 'rotate-90')}
						/>
					</button>
					{hasTask && <TaskPropertyIcon kind="issueType" name={firstLog.task?.issueType} />}
					{taskNumber && (
						<span className="shrink-0 text-xs tabular-nums text-muted-foreground">{taskNumber}</span>
					)}
					<TaskTitle log={firstLog} />
					<span className={cn(COUNT_CHIP, WIDE_ONLY)}>{countText}</span>
				</span>
				{hasNotes && (
					<span className="flex min-w-0 pl-6.5">
						<EntryNotesLine log={firstLog} />
					</span>
				)}
				<span
					className={cn('flex min-w-0 items-center gap-2 pl-6.5 text-xs text-muted-foreground', NARROW_ONLY)}
				>
					<TimesheetStatusChip status={status} className="h-5 px-1.5" />
					<span className={COUNT_CHIP}>{countText}</span>
					<span className="shrink-0 tabular-nums">{timeRange}</span>
					{showsMember && <span className="truncate">{memberName}</span>}
				</span>
			</span>
			<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
				<ProjectName log={firstLog} />
			</span>
			{showsMember && (
				<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
					<MemberCell name={memberName} imageUrl={firstLog.employee?.user?.imageUrl} />
				</span>
			)}
			<span role="cell" className={cn('flex min-w-0 flex-col', WIDE_ONLY)}>
				<span className="truncate text-[13px] tabular-nums text-foreground">{timeRange}</span>
			</span>
			<span role="cell" className="text-right text-[13px] font-medium tabular-nums text-foreground">
				{total}
			</span>
			<span role="cell" className="flex items-center justify-end gap-1">
				{menu}
			</span>
		</div>
	);
}
