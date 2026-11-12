'use client';

import { memo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { EntityTile } from '@/core/components/common/entity-tile';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { Check, CheckCircle2, DollarCircle, MoreHorizontal, Pencil, Trash, X } from '@/core/components/icons';
import { canEditLog, type TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	logDurationSeconds,
	statusOfLog,
	TIMESHEET_STATUS_ORDER,
	type TimesheetFormatters,
	timeRangeTextOf
} from '@/core/lib/utils/dashboards/timesheets';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { EntryNotesLine, LogChangeChips, ManualReasonLine } from './timesheet-log-changes';
import { STATUS_LABEL_KEYS, TimesheetStatusChip, TimesheetStatusDot } from './timesheet-status';
import { DEFERRED_ROW, logGridOf, NARROW_ONLY, WIDE_ONLY } from './timesheets-grid';

export interface TimesheetRowHandlers {
	toggleLog: (logId: string) => void;
	approve: (log: ITimeLog) => void;
	reject: (log: ITimeLog) => void;
	changeStatus: (log: ITimeLog, status: ETimesheetStatus) => void;
	setBillable: (log: ITimeLog, isBillable: boolean) => void;
	edit: (log: ITimeLog) => void;
	remove: (log: ITimeLog) => void;
}

/** Manual time is said by its Added chip, so the time column names only the other log types. */
export const LOG_TYPE_LABEL_KEYS: Partial<Record<ETimeLogType, DottedLanguageObjectStringPaths>> = {
	[ETimeLogType.IDLE]: 'dashboard.timesheets.LOG_TYPE.IDLE',
	[ETimeLogType.RESUMED]: 'dashboard.timesheets.LOG_TYPE.RESUMED'
};

const QUICK_ACTION = 'size-7 text-muted-foreground';

export function taskNumberOf(log: ITimeLog) {
	const taskNumber = log.task?.taskNumber;
	if (taskNumber) {
		return taskNumber;
	}
	const number = log.task?.number;
	if (number) {
		return `#${number}`;
	}
	return null;
}

export function TaskTitle({ log }: Readonly<{ log: ITimeLog }>) {
	const t = useTranslations();
	const taskId = log.task?.id ?? log.taskId;
	const title = log.task?.title;
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

function ProjectName({ log }: Readonly<{ log: ITimeLog }>) {
	const t = useTranslations();
	const project = log.project;
	if (!project?.name) {
		return (
			<span className="truncate text-[13px] text-muted-foreground">{t('dashboard.timesheets.NO_PROJECT')}</span>
		);
	}
	return (
		<span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
			<EntityTile
				name={project.name}
				color={project.color}
				imageUrl={project.imageUrl}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{project.name}</span>
		</span>
	);
}

function LogMenu({
	log,
	status,
	permissions,
	handlers
}: Readonly<{
	log: ITimeLog;
	status: ETimesheetStatus | null;
	permissions: TimesheetPermissions;
	handlers: TimesheetRowHandlers;
}>) {
	const t = useTranslations();
	const canEdit = canEditLog(log, permissions);
	const isBillable = Boolean(log.isBillable);
	const isNotBillable = !isBillable;
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
			<DropdownMenuContent align="end" className="min-w-48">
				{canEdit && (
					<DropdownMenuItem onClick={() => handlers.edit(log)}>
						<Pencil />
						<span>{t('common.EDIT')}</span>
					</DropdownMenuItem>
				)}
				{permissions.canApprove && (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<CheckCircle2 />
							<span>{t('common.CHANGE_STATUS')}</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="min-w-44">
							{TIMESHEET_STATUS_ORDER.map((option) => (
								<DropdownMenuItem key={option} onClick={() => handlers.changeStatus(log, option)}>
									<TimesheetStatusDot status={option} />
									<span className="flex-1">{t(STATUS_LABEL_KEYS[option])}</span>
									{option === status && <SelectedMark />}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				)}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<DollarCircle />
						<span>{t('dashboard.timesheets.BILLABLE')}</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="min-w-36">
						<DropdownMenuItem onClick={() => handlers.setBillable(log, true)}>
							<Check />
							<span className="flex-1">{t('pages.timesheet.BILLABLE.YES')}</span>
							{isBillable && <SelectedMark />}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handlers.setBillable(log, false)}>
							<X />
							<span className="flex-1">{t('pages.timesheet.BILLABLE.NO')}</span>
							{isNotBillable && <SelectedMark />}
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				{canEdit && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onClick={() => handlers.remove(log)}>
							<Trash />
							<span>{t('common.DELETE')}</span>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function QuickReview({ log, handlers }: Readonly<{ log: ITimeLog; handlers: TimesheetRowHandlers }>) {
	const t = useTranslations();
	const approveLabel = t('dashboard.timesheets.APPROVE');
	const rejectLabel = t('dashboard.timesheets.REJECT');
	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={approveLabel}
						onClick={() => handlers.approve(log)}
						className={cn(QUICK_ACTION, 'hover:text-success-foreground')}
					>
						<Check />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{approveLabel}</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={rejectLabel}
						onClick={() => handlers.reject(log)}
						className={cn(QUICK_ACTION, 'hover:text-destructive-ink')}
					>
						<X />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{rejectLabel}</TooltipContent>
			</Tooltip>
		</>
	);
}

export function rejectionReasonOf(log: ITimeLog, status: ETimesheetStatus | null) {
	const isRejected = status === ETimesheetStatus.DENIED;
	const reason = log.timesheet?.reason?.trim();
	if (!isRejected) {
		return null;
	}
	return reason || null;
}

/**
 * One time log: the checkbox, its status, the task (opening in the task drawer), project, member, the time it ran
 * and its duration, then the quick approve and reject of a pending log and the row menu. Added and Edited chips
 * follow the task; a log added by hand quotes its reason under it, and a rejected log says why.
 */
export const TimesheetLogRow = memo(function TimesheetLogRow({
	log,
	isSelected,
	showsMember,
	permissions,
	formatters,
	handlers
}: Readonly<{
	log: ITimeLog;
	isSelected: boolean;
	showsMember: boolean;
	permissions: TimesheetPermissions;
	formatters: TimesheetFormatters;
	handlers: TimesheetRowHandlers;
}>) {
	const t = useTranslations();
	const status = statusOfLog(log);
	const isPending = status === ETimesheetStatus.PENDING;
	const showsQuickReview = isPending && permissions.canApprove;
	const taskNumber = taskNumberOf(log);
	const hasTask = Boolean(log.task);
	const taskSize = log.task?.size;
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const timeRange = timeRangeTextOf(log, formatters, runningLabel);
	const durationSeconds = logDurationSeconds(log);
	const duration = formatDurationShort(durationSeconds);
	const rejectionReason = rejectionReasonOf(log, status);
	const logType = log.logType ?? ETimeLogType.TRACKED;
	const logTypeKey = LOG_TYPE_LABEL_KEYS[logType];
	const taskName = log.task?.title ?? t('dashboard.timesheets.NO_TASK');
	const memberName = log.employee?.fullName ?? '';

	return (
		<div
			role="row"
			aria-selected={isSelected}
			className={cn(
				logGridOf(showsMember),
				DEFERRED_ROW,
				'min-h-11 py-1.5',
				isSelected && 'bg-foreground/[0.03]'
			)}
		>
			<span role="cell" className="flex items-center">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => handlers.toggleLog(log.id)}
					aria-label={t('dashboard.timesheets.SELECT_LOG', { task: taskName })}
				/>
			</span>
			<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
				<TimesheetStatusChip status={status} />
			</span>
			<span role="cell" className="flex min-w-0 flex-col gap-0.5 py-0.5">
				<span className="flex min-w-0 items-center gap-1.5 text-[13px]">
					{hasTask && <TaskPropertyIcon kind="issueType" name={log.task?.issueType} />}
					{taskNumber && (
						<span className="shrink-0 text-xs tabular-nums text-muted-foreground">{taskNumber}</span>
					)}
					<TaskTitle log={log} />
					{taskSize && (
						<span title={taskSize} className="inline-flex shrink-0">
							<TaskPropertyIcon kind="size" name={taskSize} className="size-3.5" />
						</span>
					)}
					<LogChangeChips log={log} formatters={formatters} className={WIDE_ONLY} />
				</span>
				<EntryNotesLine log={log} />
				<ManualReasonLine log={log} />
				{rejectionReason && (
					<span className="truncate text-xs text-destructive-ink">
						{t('dashboard.timesheets.REJECTION_REASON', { reason: rejectionReason })}
					</span>
				)}
				<span className={cn('flex min-w-0 items-center gap-2 text-xs text-muted-foreground', NARROW_ONLY)}>
					<TimesheetStatusChip status={status} className="h-5 px-1.5" />
					<LogChangeChips log={log} formatters={formatters} />
					<span className="shrink-0 tabular-nums">{timeRange}</span>
					{showsMember && <span className="truncate">{memberName}</span>}
				</span>
			</span>
			<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
				<ProjectName log={log} />
			</span>
			{showsMember && (
				<span role="cell" className={cn('min-w-0', WIDE_ONLY)}>
					<MemberCell name={memberName} imageUrl={log.employee?.user?.imageUrl} />
				</span>
			)}
			<span role="cell" className={cn('flex min-w-0 flex-col', WIDE_ONLY)}>
				<span className="truncate text-[13px] tabular-nums text-foreground">{timeRange}</span>
				{logTypeKey && <span className="truncate text-[11px] text-muted-foreground">{t(logTypeKey)}</span>}
			</span>
			<span role="cell" className="text-right text-[13px] font-medium tabular-nums text-foreground">
				{duration}
			</span>
			<span role="cell" className="flex items-center justify-end gap-1">
				{showsQuickReview && (
					<span className={cn('flex items-center gap-1', WIDE_ONLY)}>
						<QuickReview log={log} handlers={handlers} />
					</span>
				)}
				<LogMenu log={log} status={status} permissions={permissions} handlers={handlers} />
			</span>
		</div>
	);
});
