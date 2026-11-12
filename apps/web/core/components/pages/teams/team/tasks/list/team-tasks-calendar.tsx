'use client';

import { memo, useCallback, useId, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { startOfMonth } from 'date-fns';
import {
	CALENDAR_ACTION,
	ENTRY_BAR,
	ENTRY_SOLID,
	entryToneStyle,
	WEEKEND_TINT
} from '@/core/components/calendar/calendar-recipes';
import { CalendarRangeStepper } from '@/core/components/calendar/calendar-toolbar';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { Calendar } from '@/core/components/icons';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { PersonAvatar, personFromTaskMember } from '@/core/components/teams/people-avatars';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useMediaQuery } from '@/core/hooks/common/use-media-query';
import { useToday } from '@/core/hooks/common/use-today';
import { useTeamTaskUpdates } from '@/core/hooks/tasks/use-team-task-updates';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { cn } from '@/core/lib/helpers';
import { shiftedAnchorOf, weekStartOf } from '@/core/lib/utils/calendar-view';
import { teamTasksCalendarMonthOf, type TeamTasksCalendarDay } from '@/core/lib/utils/team-tasks-calendar';
import { dayOfStoredDate } from '@/core/lib/utils/team-tasks-timeline';
import { isDoneStatus, statusOfTask, tasksOfGroups } from '@/core/lib/utils/team-tasks-view';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TeamTasksListCommands } from './team-tasks-list';
import {
	useCalendarDayDrop,
	useCalendarTaskDrag,
	useCalendarTaskMoves,
	useDayListDragOut
} from './team-tasks-calendar-dnd';

const VISIBLE_TASKS_PER_DAY = 3;

/** Tailwind's `sm`: below it seven columns do not fit, and the month is drawn as the list of its busy days. */
const MONTH_GRID_QUERY = '(min-width: 40rem)';

/** Only a mouse or a pen drags a task to another day: on a touch screen a drag would fight the scroll. */
const FINE_POINTER_QUERY = '(pointer: fine)';

/** A day a dragged task can go to, while the task is over it: the board lane's tint, drawn inside the grid's lines. */
const DROP_DAY = 'bg-primary/[0.05] hairline-ring ring-inset ring-primary/30';

/** A day's "+N more" list while one of its tasks is dragged out: gone from sight, and the pointer goes through it. */
const DRAGGED_OUT_LIST = 'pointer-events-none opacity-0';

const COUNT_CHIP =
	'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground';

const CHIP =
	'relative flex h-6 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-[5px] pr-1 pl-2 text-left text-[11px] font-medium hairline-ring ring-foreground/5 [&_[data-slot=task-property-icon]]:size-3';

interface CalendarFormats {
	monthTitle: Intl.DateTimeFormat;
	weekday: Intl.DateTimeFormat;
	dayNumber: Intl.DateTimeFormat;
	dayLabel: Intl.DateTimeFormat;
}

function calendarFormatsOf(locale: string): CalendarFormats {
	return {
		monthTitle: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
		weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
		dayNumber: new Intl.DateTimeFormat(locale, { day: 'numeric' }),
		dayLabel: new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' })
	};
}

function readableName(value: string | null | undefined) {
	const text = value ?? '';
	return text.split('-').join(' ');
}

/** What every task label of the calendar needs, the same object for all of them. */
interface ChipContext {
	statuses: TTaskStatus[];
	selectedIds: ReadonlySet<string>;
	onOpen: (taskId: string) => void;
	onToggleSelected: (taskId: string) => void;
	/** Whether tasks are dragged to another day: the month is a grid and the pointer a mouse or a pen. */
	isDragEnabled: boolean;
	/** The tasks that can change day: the active team's (a built-in view lists the person's tasks of every team). */
	movableIds: ReadonlySet<string>;
}

function canMoveTask(context: ChipContext, taskId: string) {
	const isMovable = context.movableIds.has(taskId);
	return context.isDragEnabled && isMovable;
}

/** The panel says a task can be dragged onto a day only when one of its tasks can be. */
function undatedHintKeyOf(canDragAny: boolean): DottedLanguageObjectStringPaths {
	if (canDragAny) {
		return 'pages.teamTasks.CALENDAR_UNDATED_DRAG_HINT';
	}
	return 'pages.teamTasks.CALENDAR_UNDATED_HINT';
}

function StatusGlyph({ status }: Readonly<{ status: TTaskStatus | undefined }>) {
	if (!status) {
		return <TaskPropertyPlaceholderIcon kind="status" />;
	}
	return (
		<TaskPropertyIcon
			kind="status"
			name={status.name}
			color={status.color}
			icon={status.icon}
			iconUrl={status.fullIconUrl}
		/>
	);
}

/**
 * One task on its day: a soft tint and a bar in the colour of its status, the status glyph, the title and the first
 * person it is assigned to. A finished task is struck through, a late one is written in the destructive ink. A task
 * that can change day is dragged to another one, and dims while it is moved.
 */
const TaskChip = memo(function TaskChip({
	task,
	isPastDay,
	context
}: Readonly<{ task: TTask; isPastDay: boolean; context: ChipContext }>) {
	const t = useTranslations();
	const status = statusOfTask(task, context.statuses);
	const isDone = isDoneStatus(status);
	const isOverdue = isPastDay && !isDone;
	const isSelected = context.selectedIds.has(task.id);
	const firstMember = task.members?.[0];
	const canDrag = canMoveTask(context, task.id);
	const dueDay = dayOfStoredDate(task.dueDate);
	const startDay = dayOfStoredDate(task.startDate);
	const { ref, isDragging } = useCalendarTaskDrag<HTMLButtonElement>(task.id, dueDay, startDay, canDrag);
	const labelParts = [task.title];
	if (status?.name) {
		labelParts.push(readableName(status.name));
	}
	if (isOverdue) {
		labelParts.push(t('pages.teamTasks.TIMELINE_OVERDUE'));
	}
	const label = labelParts.join(', ');
	let tooltip = task.title;
	if (canDrag) {
		tooltip = `${task.title}\n${t('pages.teamTasks.CALENDAR_DRAG_HINT')}`;
	}

	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		const togglesSelection = event.metaKey || event.ctrlKey;
		if (togglesSelection) {
			context.onToggleSelected(task.id);
			return;
		}
		context.onOpen(task.id);
	};

	return (
		<button
			ref={ref}
			type="button"
			onClick={handleClick}
			aria-label={label}
			title={tooltip}
			data-selected={isSelected}
			style={entryToneStyle(status?.color ?? null)}
			className={cn(CHIP, ENTRY_SOLID, CALENDAR_ACTION, isSelected && 'ring-primary', isDragging && 'opacity-40')}
		>
			<span className={ENTRY_BAR} />
			<StatusGlyph status={status} />
			<span
				className={cn(
					'min-w-0 flex-1 truncate text-foreground',
					isDone && 'text-muted-foreground line-through',
					isOverdue && 'text-destructive-ink'
				)}
			>
				{task.title}
			</span>
			{firstMember && (
				<PersonAvatar
					person={personFromTaskMember(firstMember)}
					className="size-4 shrink-0 text-[8px] ring-0"
				/>
			)}
		</button>
	);
});

function TaskChipList({
	tasks,
	isPastDay,
	context
}: Readonly<{ tasks: TTask[]; isPastDay: boolean; context: ChipContext }>) {
	return (
		<ul className="flex min-w-0 flex-col gap-1">
			{tasks.map((task) => (
				<li key={task.id} className="min-w-0">
					<TaskChip task={task} isPastDay={isPastDay} context={context} />
				</li>
			))}
		</ul>
	);
}

function DayNumber({ day, formats }: Readonly<{ day: TeamTasksCalendarDay; formats: CalendarFormats }>) {
	const dayNumber = formats.dayNumber.format(day.date);
	if (day.isToday) {
		return (
			<span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground">
				{dayNumber}
			</span>
		);
	}
	return (
		<span
			className={cn(
				'flex h-6 min-w-6 items-center text-xs tabular-nums text-foreground',
				day.isOutsideMonth && 'text-muted-foreground/70'
			)}
		>
			{dayNumber}
		</span>
	);
}

/**
 * "+N more" of a full day: every task of the day in a popover, which closes when one of them opens. A task dragged out
 * of it leaves the month under it free for the drop, and the popover closes once the task is dropped.
 */
function DayOverflow({
	day,
	hiddenCount,
	dayLabel,
	context
}: Readonly<{ day: TeamTasksCalendarDay; hiddenCount: number; dayLabel: string; context: ChipContext }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const { listRef, isDraggingOut } = useDayListDragOut(isOpen, setIsOpen);
	const { onOpen } = context;
	const popoverContext = useMemo<ChipContext>(
		() => ({
			...context,
			onOpen: (taskId: string) => {
				setIsOpen(false);
				onOpen(taskId);
			}
		}),
		[context, onOpen]
	);
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				render={
					<button
						type="button"
						className={cn(
							'h-5 rounded-[5px] px-1 text-left text-[11px] font-medium tabular-nums text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
							CALENDAR_ACTION
						)}
					/>
				}
			>
				{t('dashboard.calendar.MORE_ENTRIES', { count: hiddenCount })}
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={6}
				collisionPadding={12}
				className={cn('w-72 p-2', isDraggingOut && DRAGGED_OUT_LIST)}
				positionerClassName={cn(isDraggingOut && 'pointer-events-none')}
			>
				<p className="px-1 pb-2 text-xs font-medium text-muted-foreground">{dayLabel}</p>
				<div ref={listRef} className="max-h-72 overflow-y-auto custom-scrollbar">
					<TaskChipList tasks={day.tasks} isPastDay={day.isPast} context={popoverContext} />
				</div>
			</PopoverContent>
		</Popover>
	);
}

const DayCell = memo(function DayCell({
	day,
	formats,
	context
}: Readonly<{ day: TeamTasksCalendarDay; formats: CalendarFormats; context: ChipContext }>) {
	const { ref, isOver } = useCalendarDayDrop(day.dayNumber, context.isDragEnabled);
	const dayLabel = formats.dayLabel.format(day.date);
	const shownTasks = day.tasks.slice(0, VISIBLE_TASKS_PER_DAY);
	const hiddenCount = day.tasks.length - shownTasks.length;
	const hasHidden = hiddenCount > 0;
	return (
		<div
			ref={ref}
			role="gridcell"
			aria-label={dayLabel}
			data-drop-target={isOver}
			className={cn(
				'flex min-h-26 min-w-0 flex-col gap-1 p-1.5 transition-[background-color,box-shadow]',
				day.isWeekend && WEEKEND_TINT,
				day.isOutsideMonth && 'bg-foreground/[0.015]',
				isOver && DROP_DAY
			)}
		>
			<DayNumber day={day} formats={formats} />
			<TaskChipList tasks={shownTasks} isPastDay={day.isPast} context={context} />
			{hasHidden && <DayOverflow day={day} hiddenCount={hiddenCount} dayLabel={dayLabel} context={context} />}
		</div>
	);
});

function MonthGrid({
	weeks,
	formats,
	context,
	label
}: Readonly<{
	weeks: TeamTasksCalendarDay[][];
	formats: CalendarFormats;
	context: ChipContext;
	label: string;
}>) {
	const firstWeek = weeks[0] ?? [];
	return (
		<div role="grid" aria-label={label} className="flex min-h-full flex-col">
			<div role="row" className="grid grid-cols-7 hairline-b hairline-divide-x divide-border border-border">
				{firstWeek.map((day) => (
					<div
						key={day.dayNumber}
						role="columnheader"
						className={cn('px-1.5 py-2 text-xs text-muted-foreground', day.isWeekend && WEEKEND_TINT)}
					>
						{formats.weekday.format(day.date)}
					</div>
				))}
			</div>
			<div className="flex flex-1 flex-col hairline-divide-y divide-border">
				{weeks.map((week) => (
					<div
						key={week[0]?.dayNumber}
						role="row"
						className="grid flex-1 grid-cols-7 hairline-divide-x divide-border"
					>
						{week.map((day) => (
							<DayCell key={day.dayNumber} day={day} formats={formats} context={context} />
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function BusyDaysList({
	days,
	formats,
	context
}: Readonly<{ days: TeamTasksCalendarDay[]; formats: CalendarFormats; context: ChipContext }>) {
	return (
		<ul className="flex flex-col hairline-divide-y divide-border">
			{days.map((day) => (
				<li key={day.dayNumber} className="flex flex-col gap-2 p-3">
					<h3 className={cn('text-xs font-medium text-muted-foreground', day.isToday && 'text-primary-ink')}>
						{formats.dayLabel.format(day.date)}
					</h3>
					<TaskChipList tasks={day.tasks} isPastDay={day.isPast} context={context} />
				</li>
			))}
		</ul>
	);
}

const UndatedRow = memo(function UndatedRow({
	task,
	context,
	onSetDate
}: Readonly<{ task: TTask; context: ChipContext; onSetDate: (taskId: string, anchor: Element) => void }>) {
	const t = useTranslations();
	const status = statusOfTask(task, context.statuses);
	const isDone = isDoneStatus(status);
	const isSelected = context.selectedIds.has(task.id);
	const canDrag = canMoveTask(context, task.id);
	const startDay = dayOfStoredDate(task.startDate);
	const { ref, isDragging } = useCalendarTaskDrag<HTMLButtonElement>(task.id, null, startDay, canDrag);
	const setDueDateLabel = t('pages.teamTasks.SET_DUE_DATE');
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		const togglesSelection = event.metaKey || event.ctrlKey;
		if (togglesSelection) {
			context.onToggleSelected(task.id);
			return;
		}
		context.onOpen(task.id);
	};
	return (
		<li
			className={cn(
				'flex h-9 items-center gap-1 pr-2 pl-3 [contain-intrinsic-size:auto_36px] [content-visibility:auto]',
				isDragging && 'opacity-40'
			)}
		>
			<button
				ref={ref}
				type="button"
				onClick={handleClick}
				data-selected={isSelected}
				className={cn(
					'flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left text-[13px] text-foreground hover:bg-foreground/5',
					CALENDAR_ACTION,
					isSelected && 'bg-primary/[0.06] hover:bg-primary/[0.08]'
				)}
			>
				<StatusGlyph status={status} />
				<span className={cn('truncate', isDone && 'text-muted-foreground line-through')}>{task.title}</span>
			</button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`${task.title}, ${setDueDateLabel}`}
				title={setDueDateLabel}
				onClick={(event) => onSetDate(task.id, event.currentTarget)}
				className="shrink-0 text-muted-foreground"
			>
				<Calendar />
			</Button>
		</li>
	);
});

/** The tasks the month cannot place: listed apart, each dragged onto a day or given a date with the due date picker. */
function UndatedPanel({
	id,
	tasks,
	context,
	onSetDate
}: Readonly<{
	id: string;
	tasks: TTask[];
	context: ChipContext;
	onSetDate: (taskId: string, anchor: Element) => void;
}>) {
	const t = useTranslations();
	const canDragAny = tasks.some((task) => canMoveTask(context, task.id));
	return (
		<aside
			id={id}
			aria-label={t('pages.teamTasks.CALENDAR_NO_DUE_DATE')}
			className="flex min-h-0 shrink-0 flex-col border-border max-lg:max-h-64 max-lg:hairline-t lg:w-72 lg:hairline-l"
		>
			<p className="px-4 pt-3 pb-2 text-xs text-muted-foreground">{t(undatedHintKeyOf(canDragAny))}</p>
			<ul className="min-h-0 flex-1 overflow-y-auto pb-2 custom-scrollbar">
				{tasks.map((task) => (
					<UndatedRow key={task.id} task={task} context={context} onSetDate={onSetDate} />
				))}
			</ul>
		</aside>
	);
}

/**
 * A view shown as a calendar (its layout): the tasks the view lists, with its filters, scope, search and ordering, each
 * on the day it is due, in a month of six whole weeks (the Calendar page's month). The tasks without a due date sit
 * on no day: they are counted in the bar and listed in a panel where the due date picker places them. A task opens
 * in the drawer, as a row does; Cmd or Ctrl with the click selects it for the page's selection bar. With a mouse or a
 * pen, a task of the active team is dragged to another day of the grid, from its day or from the panel (a task of
 * another team, listed by a built-in view, only opens, as on the timeline).
 */
export function TeamTasksCalendarView({
	view,
	commands
}: Readonly<{ view: TeamTasksViewState; commands: TeamTasksListCommands }>) {
	const t = useTranslations();
	const locale = useLocale();
	useCurrentOrganizationOwner();
	const organization = useAtomValue(currentOrganizationState);
	const today = useToday();
	const fitsMonthGrid = useMediaQuery(MONTH_GRID_QUERY);
	const hasFinePointer = useMediaQuery(FINE_POINTER_QUERY);
	const teamTasks = useAtomValue(tasksByTeamState);
	const { moveToDay } = useTeamTaskUpdates();
	const scrollRef = useRef<HTMLDivElement>(null);
	const undatedPanelId = useId();
	const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
	const [isUndatedOpen, setIsUndatedOpen] = useState(false);
	const { openTask, openPicker } = commands;
	const { statuses, selectedIds, toggleSelected } = view;

	const weekStartsOn = weekStartOf(organization?.startWeekOn);
	const formats = useMemo(() => calendarFormatsOf(locale), [locale]);
	const tasks = useMemo(() => tasksOfGroups(view.groups), [view.groups]);
	const month = useMemo(
		() => teamTasksCalendarMonthOf(tasks, anchor, weekStartsOn, today),
		[tasks, anchor, weekStartsOn, today]
	);

	// The phone's list of days has no day to drop on: tasks are dragged on the grid only.
	const isDragEnabled = fitsMonthGrid && hasFinePointer;
	const movableIds = useMemo(() => new Set(teamTasks.map((task) => task.id)), [teamTasks]);
	useCalendarTaskMoves(scrollRef, isDragEnabled, moveToDay);

	const toggleChip = useCallback((taskId: string) => toggleSelected(taskId, false), [toggleSelected]);
	const context = useMemo<ChipContext>(
		() => ({ statuses, selectedIds, onOpen: openTask, onToggleSelected: toggleChip, isDragEnabled, movableIds }),
		[statuses, selectedIds, openTask, toggleChip, isDragEnabled, movableIds]
	);
	const setDate = useCallback(
		(taskId: string, anchorElement: Element) => openPicker('dueDate', [taskId], anchorElement),
		[openPicker]
	);

	const showPrevious = () => setAnchor((current) => shiftedAnchorOf('month', current, -1));
	const showNext = () => setAnchor((current) => shiftedAnchorOf('month', current, 1));
	const showToday = () => setAnchor(startOfMonth(today));
	const toggleUndated = () => setIsUndatedOpen((current) => !current);

	const monthTitle = formats.monthTitle.format(anchor);
	const undatedCount = month.undated.length;
	const hasUndated = undatedCount > 0;
	const showsUndatedPanel = hasUndated && isUndatedOpen;
	const hasDueTasks = month.dueInMonthCount > 0;
	let dueText = t('pages.teamTasks.CALENDAR_EMPTY_MONTH', { month: monthTitle });
	if (hasDueTasks) {
		dueText = t('pages.teamTasks.CALENDAR_DUE_COUNT', { count: month.dueInMonthCount });
	}

	return (
		<section
			aria-label={t('common.CALENDAR')}
			className="flex h-full min-h-0 flex-col"
			data-testid="team-tasks-calendar"
		>
			<div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 hairline-b border-border px-4 py-2">
				<CalendarRangeStepper
					view="month"
					rangeName={monthTitle}
					onPrevious={showPrevious}
					onToday={showToday}
					onNext={showNext}
				/>
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-xs tabular-nums text-muted-foreground">{dueText}</span>
					{hasUndated && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							aria-expanded={showsUndatedPanel}
							aria-controls={undatedPanelId}
							onClick={toggleUndated}
						>
							{t('pages.teamTasks.CALENDAR_NO_DUE_DATE')}
							<span className={COUNT_CHIP}>{undatedCount}</span>
						</Button>
					)}
				</div>
			</div>
			<div className="flex min-h-0 flex-1 max-lg:flex-col">
				<div ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-auto custom-scrollbar">
					{fitsMonthGrid && (
						<MonthGrid weeks={month.weeks} formats={formats} context={context} label={monthTitle} />
					)}
					{!fitsMonthGrid && <BusyDaysList days={month.busyDays} formats={formats} context={context} />}
				</div>
				{showsUndatedPanel && (
					<UndatedPanel id={undatedPanelId} tasks={month.undated} context={context} onSetDate={setDate} />
				)}
			</div>
		</section>
	);
}
