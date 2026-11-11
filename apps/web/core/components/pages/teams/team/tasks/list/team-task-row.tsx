'use client';

import { memo, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { Calendar, MoreHorizontal, ParentTask, SubTasks } from '@/core/components/icons';
import {
	TaskPropertyIcon,
	TaskPropertyPlaceholderIcon,
	type TaskPropertyKind
} from '@/core/components/tasks/task-property-icon';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { PersonAvatar, personFromTaskMember, type Person } from '@/core/components/teams/people-avatars';
import { isPlainClick } from '@/core/components/tasks/drawer/task-drawer-link';
import { useTaskWorkedSeconds } from '@/core/hooks/tasks/use-task-worked-seconds';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { cn } from '@/core/lib/helpers';
import {
	dueDateToneOf,
	isDoneStatus,
	isEpic,
	statusOfTask,
	taskNumberLabel,
	type DueDateTone
} from '@/core/lib/utils/team-tasks-view';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTeamTasksList, type TeamTaskPickerKind } from './team-tasks-list-context';
import { TEAM_TASK_ROW_GRID, TEAM_TASK_WIDE_CELL, type TeamTaskColumn } from './team-tasks-grid';
import { useTeamTaskRowDrag } from './team-task-row-dnd';

const VISIBLE_LABEL_COUNT = 2;
const VISIBLE_PEOPLE_COUNT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A cell that opens a picker: a quiet button the size of its cell, its empty state revealed on row hover. */
const CELL_BUTTON =
	'group/cell flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md px-1.5 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25';

const GLYPH_BUTTON =
	'flex size-7 shrink-0 items-center justify-center rounded-md outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25';

/** Shown only while the row is hovered or focused, and always on touch screens, where hover does not exist. */
const ON_ROW_HOVER =
	'opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 group-data-[focused]/row:opacity-100 [@media(hover:none)]:opacity-100';

const LABEL_CHIP =
	'chip-3d inline-flex h-5 min-w-0 max-w-24 shrink items-center gap-1 rounded-[5px] px-1.5 text-[11px] font-medium [&_[data-slot=task-property-icon]]:size-3';

const MUTED_CHIP =
	'inline-flex h-5 shrink-0 items-center rounded-[5px] bg-foreground/5 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground';

const DUE_TONE_CLASS: Record<DueDateTone, string> = {
	overdue: 'text-destructive-ink',
	soon: 'text-warning-foreground',
	later: 'text-foreground'
};

function itemOf<T>(items: Map<string, T>, key: string | null | undefined) {
	if (!key) {
		return undefined;
	}
	return items.get(key);
}

function focusFlag(isFocused: boolean) {
	if (!isFocused) {
		return undefined;
	}
	return '';
}

/** Only one row is in the tab order; the arrows move between rows (a roving focus). */
function rowTabIndex(isTabStop: boolean) {
	if (isTabStop) {
		return 0;
	}
	return -1;
}

function readableName(value: string | null | undefined) {
	const text = value ?? '';
	return text.split('-').join(' ');
}

function formatDuration(seconds: number) {
	const { hours, minutes } = secondsToTime(seconds);
	return `${hours}h ${minutes}m`;
}

function startOfDay(time: number) {
	const day = new Date(time);
	day.setHours(0, 0, 0, 0);
	return day.getTime();
}

function daysFromToday(value: Date | string, now: number) {
	const dayTime = startOfDay(new Date(value).getTime());
	const today = startOfDay(now);
	return Math.round((dayTime - today) / DAY_MS);
}

/** Clicks on the row's own controls are theirs; anywhere else on the row opens the task. */
function isOnControl(target: EventTarget | null) {
	if (!(target instanceof Element)) {
		return false;
	}
	const control = target.closest('button, a, input, [role="checkbox"], [role="menu"], [role="menuitem"]');
	return Boolean(control);
}

function PickerCell({
	kind,
	taskId,
	label,
	className,
	children
}: Readonly<{ kind: TeamTaskPickerKind; taskId: string; label: string; className?: string; children: ReactNode }>) {
	const { openPicker } = useTeamTasksList();
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		openPicker(kind, [taskId], event.currentTarget);
	};
	return (
		<button type="button" data-cell={kind} aria-label={label} onClick={handleClick} className={className}>
			{children}
		</button>
	);
}

function Placeholder({ kind }: Readonly<{ kind: TaskPropertyKind }>) {
	return <TaskPropertyPlaceholderIcon kind={kind} className={ON_ROW_HOVER} />;
}

function PriorityCell({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { priorityItems } = useTeamTasksList();
	const priority = task.priority as string | null | undefined;
	const item = itemOf(priorityItems, priority);
	const label = `${t('taskMenus.fields.priority')}: ${readableName(priority)}`;
	return (
		<PickerCell kind="priority" taskId={task.id} label={label} className={GLYPH_BUTTON}>
			{priority && <TaskPropertyIcon kind="priority" name={priority} color={item?.bgColor} />}
			{!priority && <Placeholder kind="priority" />}
		</PickerCell>
	);
}

function StatusCell({ task, hidesOnWide }: Readonly<{ task: TTask; hidesOnWide: boolean }>) {
	const t = useTranslations();
	const { statuses } = useTeamTasksList();
	const status = statusOfTask(task, statuses);
	const name = status?.name ?? (task.status as string | null | undefined);
	const label = `${t('taskMenus.fields.status')}: ${readableName(name)}`;
	return (
		<span role="gridcell" className={cn('flex justify-center', hidesOnWide && 'lg:hidden')}>
			<PickerCell kind="status" taskId={task.id} label={label} className={GLYPH_BUTTON}>
				{name && <TaskPropertyIcon kind="status" name={name} color={status?.color} />}
				{!name && <Placeholder kind="status" />}
			</PickerCell>
		</span>
	);
}

function ParentHint({ task }: Readonly<{ task: TTask }>) {
	const { taskById } = useTeamTasksList();
	const parentId = task.parentId ?? task.parent?.id;
	if (!parentId) {
		return null;
	}
	const parent = taskById.get(parentId) ?? task.parent;
	if (!parent) {
		return null;
	}
	const number = taskNumberLabel(parent as TTask);
	return (
		<span className="flex min-w-0 shrink items-center gap-1 text-xs text-muted-foreground max-sm:hidden">
			<ParentTask className="size-3.5 shrink-0" aria-hidden="true" />
			{number && <span className="shrink-0 tabular-nums">{number}</span>}
			<span className="truncate">{parent.title}</span>
		</span>
	);
}

function SubTaskCount({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { childCounts, childDoneCounts } = useTeamTasksList();
	const total = childCounts.get(task.id) ?? 0;
	if (total === 0) {
		return null;
	}
	const done = childDoneCounts.get(task.id) ?? 0;
	return (
		<span className={cn(MUTED_CHIP, 'gap-1')} aria-label={t('pages.teamTasks.SUB_TASKS_DONE', { done, total })}>
			<SubTasks className="size-3" aria-hidden="true" />
			{done}/{total}
		</span>
	);
}

function TitleCell({
	task,
	isDone,
	showsIssueType,
	showsParent,
	isReorderable
}: Readonly<{ task: TTask; isDone: boolean; showsIssueType: boolean; showsParent: boolean; isReorderable: boolean }>) {
	const t = useTranslations();
	const { openTask } = useTeamTasksList();
	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (!isPlainClick(event)) {
			return;
		}
		event.preventDefault();
		openTask(task.id);
	};
	const hasIssueType = showsIssueType && Boolean(task.issueType);
	const canChangeType = !isEpic(task);
	const issueTypeLabel = `${t('taskMenus.fields.issueType')}: ${task.issueType ?? ''}`;
	return (
		<span role="gridcell" className="flex min-w-0 items-center gap-2 pr-2">
			{hasIssueType && !canChangeType && <TaskPropertyIcon kind="issueType" name={task.issueType} />}
			{hasIssueType && canChangeType && (
				<PickerCell
					kind="issueType"
					taskId={task.id}
					label={issueTypeLabel}
					className="-ml-0.5 flex shrink-0 rounded-[5px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<TaskPropertyIcon kind="issueType" name={task.issueType} />
				</PickerCell>
			)}
			<Link
				href={`/task/${task.id}`}
				onClick={handleClick}
				tabIndex={-1}
				// In a manual order the row is dragged, not the link.
				draggable={isReorderable ? false : undefined}
				className={cn(
					'min-w-0 truncate text-[13px] font-medium outline-none hover:underline hover:decoration-foreground/30 hover:underline-offset-2',
					isDone && 'text-muted-foreground',
					!isDone && 'text-foreground'
				)}
			>
				{task.title}
			</Link>
			<SubTaskCount task={task} />
			{showsParent && <ParentHint task={task} />}
		</span>
	);
}

function LabelsCell({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const labels = task.tags ?? [];
	const shown = labels.slice(0, VISIBLE_LABEL_COUNT);
	const hiddenCount = labels.length - shown.length;
	const hasLabels = labels.length > 0;
	return (
		<PickerCell
			kind="labels"
			taskId={task.id}
			label={t('taskMenus.fields.label')}
			className={cn(CELL_BUTTON, 'w-full')}
		>
			{shown.map((label) => {
				const isPainted = isPaintableColor(label.color);
				let style;
				if (isPainted) {
					style = dataColorChipStyle(label.color as string);
				}
				return (
					<span
						key={label.id}
						style={style}
						className={cn(LABEL_CHIP, !isPainted && '[--chip:hsl(var(--muted-foreground))]')}
					>
						<span className="truncate">{label.name}</span>
					</span>
				);
			})}
			{hiddenCount > 0 && <span className={MUTED_CHIP}>+{hiddenCount}</span>}
			{!hasLabels && <Placeholder kind="label" />}
		</PickerCell>
	);
}

function SizeCell({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { sizeItems } = useTeamTasksList();
	const size = task.size as string | null | undefined;
	const item = itemOf(sizeItems, size);
	return (
		<PickerCell kind="size" taskId={task.id} label={t('taskMenus.fields.size')} className={CELL_BUTTON}>
			{size && <TaskPropertyIcon kind="size" name={size} color={item?.bgColor} />}
			{size && <span className="truncate text-xs capitalize text-foreground">{readableName(size)}</span>}
			{!size && <Placeholder kind="size" />}
		</PickerCell>
	);
}

function ProjectCell({ task }: Readonly<{ task: TTask }>) {
	const { projectNames } = useTeamTasksList();
	const name = itemOf(projectNames, task.projectId);
	if (!name) {
		return null;
	}
	return (
		<span className="flex min-w-0 items-center gap-1.5 px-1.5 text-xs text-muted-foreground">
			<TaskPropertyIcon kind="project" className="size-3.5" />
			<span className="truncate">{name}</span>
		</span>
	);
}

function LivePill({ people, seconds }: Readonly<{ people: Person[]; seconds: number }>) {
	const t = useTranslations();
	const names = people.map((person) => person.name).join(', ');
	return (
		<span
			className="flex items-center gap-1.5 text-xs font-medium text-success-foreground"
			aria-label={t('pages.teamTasks.TRACKED_NOW_BY', { names })}
		>
			<span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
			{t('common.LIVE')}
			<span className="tabular-nums text-foreground">{formatDuration(seconds)}</span>
		</span>
	);
}

function ProgressCell({ task }: Readonly<{ task: TTask }>) {
	const { liveByTask } = useTeamTasksList();
	const workedSeconds = useTaskWorkedSeconds(task.id);
	const livePeople = liveByTask.get(task.id);
	const estimate = task.estimate ?? 0;
	const hasEstimate = estimate > 0;
	const hasWorked = workedSeconds > 0;
	if (livePeople) {
		return (
			<span className="px-1.5">
				<LivePill people={livePeople} seconds={workedSeconds} />
			</span>
		);
	}
	if (!hasEstimate && !hasWorked) {
		return null;
	}
	const ratio = Math.min(workedSeconds / Math.max(estimate, 1), 1);
	const isOver = hasEstimate && workedSeconds > estimate;
	return (
		<span className="flex min-w-0 flex-col gap-1 px-1.5">
			<span className="flex items-baseline gap-1 whitespace-nowrap text-xs tabular-nums">
				<span className={cn('font-medium', isOver && 'text-warning-foreground', !isOver && 'text-foreground')}>
					{formatDuration(workedSeconds)}
				</span>
				{hasEstimate && <span className="text-muted-foreground">/ {formatDuration(estimate)}</span>}
			</span>
			{hasEstimate && (
				<span className="h-0.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]" aria-hidden="true">
					<span
						className={cn('block h-full rounded-full', isOver && 'bg-warning', !isOver && 'bg-primary')}
						style={{ width: `${ratio * 100}%` }}
					/>
				</span>
			)}
		</span>
	);
}

function DueDateCell({ task, isDone }: Readonly<{ task: TTask; isDone: boolean }>) {
	const t = useTranslations();
	const { formatDay, formatRelativeDay, now } = useTeamTasksList();
	const dueDate = task.dueDate;
	if (!dueDate) {
		return (
			<PickerCell kind="dueDate" taskId={task.id} label={t('pages.taskDetails.DUE_DATE')} className={CELL_BUTTON}>
				<Calendar className={cn('size-4 text-muted-foreground', ON_ROW_HOVER)} aria-hidden="true" />
			</PickerCell>
		);
	}
	const tone = dueDateToneOf(dueDate, isDone, now);
	const days = daysFromToday(dueDate, now);
	const isNear = Math.abs(days) <= 1;
	let text = formatDay(dueDate);
	if (isNear) {
		text = formatRelativeDay(days);
	}
	return (
		<PickerCell kind="dueDate" taskId={task.id} label={t('pages.taskDetails.DUE_DATE')} className={CELL_BUTTON}>
			<span className={cn('truncate text-xs tabular-nums first-letter:uppercase', DUE_TONE_CLASS[tone])}>
				{text}
			</span>
		</PickerCell>
	);
}

function CreatedCell({ task }: Readonly<{ task: TTask }>) {
	const { formatDay } = useTeamTasksList();
	if (!task.createdAt) {
		return null;
	}
	return (
		<span className="truncate px-1.5 text-xs tabular-nums text-muted-foreground">{formatDay(task.createdAt)}</span>
	);
}

function AssigneesCell({ task, hidesOnWide }: Readonly<{ task: TTask; hidesOnWide: boolean }>) {
	const t = useTranslations();
	const people = (task.members ?? []).map(personFromTaskMember);
	const shown = people.slice(0, VISIBLE_PEOPLE_COUNT);
	const hiddenCount = people.length - shown.length;
	const hasPeople = people.length > 0;
	const names = people.map((person) => person.name).join(', ');
	let label: string = t('pages.teamTasks.NO_USER_ASSIGNED');
	if (hasPeople) {
		label = `${t('pages.taskDetails.ASSIGNEES')}: ${names}`;
	}
	return (
		<span role="gridcell" className={cn('flex justify-end lg:justify-start', hidesOnWide && 'lg:hidden')}>
			<PickerCell kind="assignees" taskId={task.id} label={label} className={CELL_BUTTON}>
				<span className="flex items-center -space-x-1.5">
					{shown.map((person) => (
						<PersonAvatar key={person.id} person={person} className="size-5 text-[9px]" />
					))}
				</span>
				{hiddenCount > 0 && (
					<span className="text-[11px] font-medium tabular-nums text-muted-foreground">+{hiddenCount}</span>
				)}
				{!hasPeople && (
					<span
						className={cn(
							'flex size-5 items-center justify-center rounded-full hairline-border border-dashed border-foreground/30',
							ON_ROW_HOVER
						)}
						aria-hidden="true"
					/>
				)}
			</PickerCell>
		</span>
	);
}

function TrailingCell({ column, task, isDone }: Readonly<{ column: TeamTaskColumn; task: TTask; isDone: boolean }>) {
	if (column === 'labels') {
		return <LabelsCell task={task} />;
	}
	if (column === 'size') {
		return <SizeCell task={task} />;
	}
	if (column === 'project') {
		return <ProjectCell task={task} />;
	}
	if (column === 'progress') {
		return <ProgressCell task={task} />;
	}
	if (column === 'dueDate') {
		return <DueDateCell task={task} isDone={isDone} />;
	}
	if (column === 'created') {
		return <CreatedCell task={task} />;
	}
	return null;
}

export interface TeamTaskRowProps {
	task: TTask;
	isSelected: boolean;
	isFocused: boolean;
	/** The row Tab lands on: the focused one, or the first when none is. */
	isTabStop: boolean;
	isSelecting: boolean;
	/** The group the row moves in when the list follows a saved view's manual order; null otherwise. */
	reorderGroupKey?: string | null;
}

function DropLine({ edge }: Readonly<{ edge: 'top' | 'bottom' | null }>) {
	if (!edge) {
		return null;
	}
	return (
		<span
			aria-hidden="true"
			className={cn(
				'pointer-events-none absolute inset-x-0 z-[1] h-0.5 bg-primary',
				edge === 'top' && '-top-px',
				edge === 'bottom' && '-bottom-px'
			)}
		/>
	);
}

/**
 * One task of the list, 40px on one line. Light by design: it reads the list context and its own task, holds no
 * popover of its own (every cell opens the list's shared picker) and is memoised, so scrolling a long list only
 * renders the rows that come into view.
 */
export const TeamTaskRow = memo(function TeamTaskRow({
	task,
	isSelected,
	isFocused,
	isTabStop,
	isSelecting,
	reorderGroupKey = null
}: TeamTaskRowProps) {
	const t = useTranslations();
	const { rowRef, isDragging, dropEdge } = useTeamTaskRowDrag(task.id, reorderGroupKey);
	const isReorderable = reorderGroupKey !== null;
	const { grid, properties, statuses, liveByTask, openTask, openRowMenu, toggleSelected, focusTask } =
		useTeamTasksList();
	const status = statusOfTask(task, statuses);
	const isDone = isDoneStatus(status);
	const isLive = liveByTask.has(task.id);
	const number = taskNumberLabel(task);
	const showsStatusOnWide = properties.status;
	const showsAssigneesOnWide = properties.assignees;
	const hasNumber = Boolean(number);

	const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
		if (isOnControl(event.target)) {
			return;
		}
		openTask(task.id);
	};
	const handleSelectClick = (event: MouseEvent<HTMLElement>) => {
		event.preventDefault();
		toggleSelected(task.id, event.shiftKey);
	};
	const handleMenuClick = (event: MouseEvent<HTMLButtonElement>) => {
		openRowMenu(task.id, event.currentTarget, reorderGroupKey);
	};

	return (
		<div
			ref={rowRef}
			role="row"
			tabIndex={rowTabIndex(isTabStop)}
			data-task-id={task.id}
			data-group-key={reorderGroupKey ?? undefined}
			data-focused={focusFlag(isFocused)}
			aria-selected={isSelected}
			onClick={handleRowClick}
			onFocus={() => focusTask(task.id)}
			className={cn(
				TEAM_TASK_ROW_GRID,
				'group/row relative h-10 cursor-default pr-1 outline-none hairline-b border-border transition-colors hover:bg-foreground/[0.025] data-[focused]:bg-foreground/[0.035] max-lg:pl-1',
				isSelected && 'bg-primary/[0.05] hover:bg-primary/[0.07] data-[focused]:bg-primary/[0.08]',
				isDragging && 'opacity-40'
			)}
		>
			<DropLine edge={dropEdge} />
			{isLive && (
				<span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary" />
			)}
			<span role="gridcell" className={cn(TEAM_TASK_WIDE_CELL, 'flex justify-center')}>
				<Checkbox
					checked={isSelected}
					onClick={handleSelectClick}
					aria-label={t('pages.teamTasks.SELECT_TASK', { title: task.title })}
					className={cn(!isSelecting && ON_ROW_HOVER)}
				/>
			</span>
			{grid.leading.map((column) => {
				if (column === 'priority') {
					return (
						<span key={column} role="gridcell" className={cn(TEAM_TASK_WIDE_CELL, 'flex justify-center')}>
							<PriorityCell task={task} />
						</span>
					);
				}
				if (column === 'number') {
					return (
						<span
							key={column}
							role="gridcell"
							className={cn(
								TEAM_TASK_WIDE_CELL,
								'truncate px-1.5 text-xs tabular-nums text-muted-foreground'
							)}
						>
							{hasNumber && number}
						</span>
					);
				}
				return null;
			})}
			<StatusCell task={task} hidesOnWide={!showsStatusOnWide} />
			<TitleCell
				task={task}
				isDone={isDone}
				showsIssueType={properties.issueType}
				showsParent={properties.parent}
				isReorderable={isReorderable}
			/>
			{grid.trailing.map((column) => {
				if (column === 'assignees') {
					return null;
				}
				return (
					<span key={column} role="gridcell" className={cn(TEAM_TASK_WIDE_CELL, 'flex min-w-0 items-center')}>
						<TrailingCell column={column} task={task} isDone={isDone} />
					</span>
				);
			})}
			<AssigneesCell task={task} hidesOnWide={!showsAssigneesOnWide} />
			<span role="gridcell" className="flex justify-center">
				<button
					type="button"
					aria-label={t('common.MORE_OPTIONS')}
					onClick={handleMenuClick}
					className={cn(GLYPH_BUTTON, 'text-muted-foreground', ON_ROW_HOVER)}
				>
					<MoreHorizontal className="size-4" />
				</button>
			</span>
		</div>
	);
});
