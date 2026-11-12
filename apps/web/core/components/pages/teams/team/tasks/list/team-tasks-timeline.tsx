'use client';

import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type PointerEvent,
	type RefObject
} from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { ENTRY_BAR, ENTRY_SOLID, entryToneStyle, WEEKEND_TINT } from '@/core/components/calendar/calendar-recipes';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/core/components/common/hover-card';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { useMediaQuery } from '@/core/hooks/common/use-media-query';
import { useToday } from '@/core/hooks/common/use-today';
import { useTeamTaskUpdates } from '@/core/hooks/tasks/use-team-task-updates';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { tasksByTeamState } from '@/core/stores';
import { isWeekendDay } from '@/core/lib/utils/calendar-view';
import { isDoneStatus, statusOfTask, tasksOfGroups } from '@/core/lib/utils/team-tasks-view';
import {
	TIMELINE_DAY_WIDTH,
	dateOfDayNumber,
	dayNumberOf,
	dayOfStoredDate,
	hasEndHandlesOf,
	previewDaysOf,
	labelledTicksOf,
	ticksOf,
	TIMELINE_HEADER_LABEL_WIDTH,
	timelineOf,
	type TeamTasksTimelineBar,
	type TeamTasksTimelineDrag,
	type TeamTasksTimelineZoom
} from '@/core/lib/utils/team-tasks-timeline';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TeamTasksListCommands } from './team-tasks-list';
import { BarPeople, peopleOfTask, StatusGlyph, TimelineTaskCard } from './team-tasks-timeline-card';

const TITLE_WIDTH = 260;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 44;
const ZOOMS: TeamTasksTimelineZoom[] = ['week', 'month'];

/** Only a mouse hovers: on a touch screen a tap opens the task, and the card never shows. */
const HOVER_QUERY = '(hover: hover)';

/** The pause before a bar's card shows, so the pointer crossing the rows does not flash a card on each. */
const CARD_OPEN_DELAY = 450;
const CARD_CLOSE_DELAY = 120;

/** The narrowest bars that still show their status glyph, their title and the faces of their people. */
const GLYPH_MIN_WIDTH = 40;
const TITLE_MIN_WIDTH = 64;
const PEOPLE_MIN_WIDTH = 132;

/** A row's title cell is opaque (bars scroll under it): its hover tint is mixed into the page's background. */
const ROW_TITLE_HOVER = 'group-hover/row:bg-[color-mix(in_oklab,hsl(var(--foreground))_2.5%,hsl(var(--background)))]';

function zoomLabelKey(zoom: TeamTasksTimelineZoom) {
	if (zoom === 'week') {
		return 'pages.teamTasks.TIMELINE_ZOOM_WEEKS';
	}
	return 'pages.teamTasks.TIMELINE_ZOOM_MONTHS';
}

function prefersReducedMotion() {
	const canQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
	if (!canQuery) {
		return false;
	}
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scrolls the calendar to `left`, smoothly unless the reader asked for less motion. */
function scrollCalendarTo(element: HTMLElement, left: number) {
	const canScrollSmoothly = typeof element.scrollTo === 'function';
	if (!canScrollSmoothly) {
		element.scrollLeft = left;
		return;
	}
	let behavior: ScrollBehavior = 'smooth';
	if (prefersReducedMotion()) {
		behavior = 'auto';
	}
	element.scrollTo({ left, behavior });
}

/** Where the calendar shows today: a third from the left of the days in view. */
function todayScrollLeftOf(element: HTMLElement, todayDay: number, dayWidth: number) {
	const daysWidth = element.clientWidth - TITLE_WIDTH;
	const todayLeft = todayDay * dayWidth;
	const thirdOfDays = daysWidth / 3;
	return Math.max(0, todayLeft - thirdOfDays);
}

/** The card is the mouse's: a focus (the drawer giving it back on Escape, a Tab) opens nothing. */
function isFocusOpening(isOpen: boolean, reason: string) {
	const isOpening = isOpen;
	const isByFocus = reason === 'trigger-focus';
	return isOpening && isByFocus;
}

/**
 * A view shown as a timeline (its layout): the tasks the view lists, with its filters, scope, search and ordering, one
 * row each, as a bar from the task's start date to its due date on a calendar of days. A task with a due date only is
 * one day at its due date; a start date only, one day at its start. The tasks with neither date are listed under the
 * calendar. A bar takes the colour of the task's status and holds the faces of its people; hovering it, a card says
 * the rest. A bar opens its task, as a row does; the calendar opens on today, and Today brings it back. A task of the
 * active team changes its dates from its bar: dragged (the whole bar, or either end of a range) or with Alt + arrows
 * (Alt + Shift + arrows for the due date); a task of another team (a built-in view lists the person's tasks of every
 * team) only opens.
 */
export function TeamTasksTimelineView({
	view,
	commands
}: Readonly<{ view: TeamTasksViewState; commands: TeamTasksListCommands }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [zoom, setZoom] = useState<TeamTasksTimelineZoom>('week');
	const today = useToday();
	const canHover = useMediaQuery(HOVER_QUERY);
	const dragHintId = useId();
	const scrollRef = useRef<HTMLDivElement>(null);
	const { moveDates } = useTeamTaskUpdates();
	const teamTasks = useAtomValue(tasksByTeamState);
	const teamTaskIds = useMemo(() => new Set(teamTasks.map((task) => task.id)), [teamTasks]);
	const tasks = useMemo(() => tasksOfGroups(view.groups), [view.groups]);
	const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
	const timeline = useMemo(
		() =>
			timelineOf(
				tasks.map((task) => ({
					id: task.id,
					startDate: task.startDate ?? null,
					dueDate: task.dueDate ?? null,
					isDone: isDoneStatus(statusOfTask(task, view.statuses))
				})),
				{ today, zoom }
			),
		[tasks, view.statuses, today, zoom]
	);
	const ticks = useMemo(() => ticksOf(timeline, zoom), [timeline, zoom]);
	const formats = useMemo(
		() => ({
			day: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
			dayWithYear: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
			month: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
			dayOfMonth: new Intl.DateTimeFormat(locale, { day: 'numeric' })
		}),
		[locale]
	);
	const zoomItems = useMemo<SegmentedControlItem<TeamTasksTimelineZoom>[]>(
		() => ZOOMS.map((each) => ({ value: each, label: t(zoomLabelKey(each)) })),
		[t]
	);
	const dayWidth = TIMELINE_DAY_WIDTH[zoom];
	const labelledTicks = useMemo(
		() => labelledTicksOf(ticks, dayWidth, TIMELINE_HEADER_LABEL_WIDTH[zoom]),
		[ticks, dayWidth, zoom]
	);
	const calendarWidth = timeline.dayCount * dayWidth;
	const firstDay = dayNumberOf(timeline.firstDay);
	const isWeekZoom = zoom === 'week';

	// The calendar opens on today (a third from the left), and again when the zoom changes.
	const todayDay = timeline.todayDay;
	useEffect(() => {
		const element = scrollRef.current;
		if (!element || todayDay === null) {
			return;
		}
		element.scrollLeft = todayScrollLeftOf(element, todayDay, dayWidth);
	}, [todayDay, dayWidth]);

	const showToday = () => {
		const element = scrollRef.current;
		if (!element || todayDay === null) {
			return;
		}
		scrollCalendarTo(element, todayScrollLeftOf(element, todayDay, dayWidth));
	};

	/** The task's own dates (never the calendar's edges a long bar is cut at), with the year when it is not this one. */
	const datesOf = (bar: TeamTasksTimelineBar) => {
		const day = (value: number) => {
			const date = dateOfDayNumber(value);
			const isThisYear = date.getFullYear() === today.getFullYear();
			if (isThisYear) {
				return formats.day.format(date);
			}
			return formats.dayWithYear.format(date);
		};
		const { taskStartDay, taskDueDay } = bar;
		const hasStart = taskStartDay !== null;
		const hasDue = taskDueDay !== null;
		const spansDays = taskStartDay !== taskDueDay;
		const isRange = hasStart && hasDue && spansDays;
		if (isRange) {
			return t('pages.teamTasks.TIMELINE_RANGE', { start: day(taskStartDay), end: day(taskDueDay) });
		}
		if (taskDueDay !== null) {
			return day(taskDueDay);
		}
		if (taskStartDay !== null) {
			return day(taskStartDay);
		}
		return '';
	};
	/** What is particular about a bar's dates: one date only, a due date before the start, late. */
	const notesOf = (bar: TeamTasksTimelineBar) => {
		const notes: string[] = [];
		if (bar.isDueOnly) {
			notes.push(t('pages.teamTasks.TIMELINE_DUE_ONLY'));
		}
		if (bar.isStartOnly) {
			notes.push(t('pages.teamTasks.TIMELINE_START_ONLY'));
		}
		if (bar.hasInvalidRange) {
			notes.push(t('pages.teamTasks.TIMELINE_INVALID_RANGE'));
		}
		if (bar.isOverdue) {
			notes.push(t('pages.teamTasks.TIMELINE_OVERDUE'));
		}
		return notes;
	};

	const hasTasks = timeline.bars.length > 0 || timeline.unscheduledIds.length > 0;
	const hasBars = timeline.bars.length > 0;
	const hasUnscheduled = timeline.unscheduledIds.length > 0;
	const isTodayDrawn = todayDay !== null;
	// Today scrolls the calendar, which only exists with bars to draw.
	const canShowToday = hasBars && isTodayDrawn;
	let todayCenter = 0;
	if (isTodayDrawn) {
		const todayLeft = todayDay * dayWidth;
		const halfDay = dayWidth / 2;
		todayCenter = todayLeft + halfDay;
	}

	return (
		<section
			aria-label={t('pages.teamTasks.LAYOUT_TIMELINE')}
			className="flex h-full min-h-0 flex-col"
			data-testid="team-tasks-timeline"
		>
			{/* How to move a bar's dates, for screen readers: the hover card shows it to the mouse. */}
			<p id={dragHintId} className="sr-only">
				{t('pages.teamTasks.TIMELINE_DRAG_HINT')}
			</p>
			<div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 hairline-b border-border px-4 py-2">
				<Button type="button" variant="outline" size="sm" onClick={showToday} disabled={!canShowToday}>
					{t('common.TODAY')}
				</Button>
				<SegmentedControl
					items={zoomItems}
					value={zoom}
					onValueChange={setZoom}
					ariaLabel={t('pages.teamTasks.TIMELINE_ZOOM')}
				/>
			</div>

			{!hasTasks && (
				<p className="px-4 py-3 text-sm text-muted-foreground">{t('pages.teamTasks.TIMELINE_EMPTY')}</p>
			)}

			{hasBars && (
				<div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto custom-scrollbar">
					<div className="relative" style={{ width: TITLE_WIDTH + calendarWidth }}>
						{/* The header: month or week labels over the days, today marked on its day. */}
						<div
							className="sticky top-0 z-20 flex hairline-b border-border bg-background"
							style={{ height: HEADER_HEIGHT }}
						>
							<div
								className="sticky left-0 z-30 shrink-0 hairline-r border-border bg-background"
								style={{ width: TITLE_WIDTH }}
							/>
							<div className="relative" style={{ width: calendarWidth }} aria-hidden="true">
								{labelledTicks.map((tick) => (
									<span
										key={tick.day}
										className="absolute top-1.5 whitespace-nowrap pl-1 text-xs font-medium text-foreground"
										style={{ left: tick.day * dayWidth }}
									>
										{isWeekZoom && formats.day.format(tick.date)}
										{!isWeekZoom && formats.month.format(tick.date)}
									</span>
								))}
								{isWeekZoom &&
									ticks.map((tick) => (
										<DayNumber
											key={`d${tick.day}`}
											date={tick.date}
											label={formats.dayOfMonth.format(tick.date)}
											left={tick.day * dayWidth}
											width={dayWidth}
											isToday={tick.day === todayDay}
										/>
									))}
								{!isWeekZoom && isTodayDrawn && (
									<span
										className="absolute bottom-1.5 size-1.5 -translate-x-1/2 rounded-full bg-primary"
										style={{ left: todayCenter }}
									/>
								)}
							</div>
						</div>

						{/* Weekends, lines of the weeks or months, and today, behind the rows. */}
						<div
							className="pointer-events-none absolute bottom-0"
							style={{ left: TITLE_WIDTH, top: HEADER_HEIGHT, width: calendarWidth }}
							aria-hidden="true"
						>
							{isWeekZoom &&
								ticks
									.filter((tick) => isWeekendDay(tick.date))
									.map((tick) => (
										<span
											key={`w${tick.day}`}
											className={cn('absolute inset-y-0', WEEKEND_TINT)}
											style={{ left: tick.day * dayWidth, width: dayWidth }}
											data-testid="timeline-weekend"
										/>
									))}
							{ticks
								.filter((tick) => tick.isMajor)
								.map((tick) => (
									<span
										key={tick.day}
										className="absolute inset-y-0 w-(--hairline) bg-border"
										style={{ left: tick.day * dayWidth }}
									/>
								))}
							{isTodayDrawn && (
								<span
									className="absolute inset-y-0 w-0.5 bg-primary/70"
									style={{ left: todayDay * dayWidth + dayWidth / 2 }}
									data-testid="timeline-today"
								/>
							)}
						</div>

						<ul className="relative" aria-label={t('pages.teamTasks.LAYOUT_TIMELINE')}>
							{timeline.bars.map((bar) => {
								const task = taskById.get(bar.taskId);
								if (!task) {
									return null;
								}
								const dates = datesOf(bar);
								const notes = notesOf(bar);
								const label = [task.title, dates, ...notes].join(' · ');
								const datesText = [dates, ...notes].join(' · ');
								return (
									<li
										key={bar.taskId}
										className="group/row flex hairline-b border-border/60 transition-colors hover:bg-foreground/[0.025]"
										style={{ height: ROW_HEIGHT }}
									>
										<button
											type="button"
											onClick={() => commands.openTask(task.id)}
											className={cn(
												'sticky left-0 z-10 flex shrink-0 items-center gap-2 truncate hairline-r border-border bg-background px-3 text-left text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25',
												ROW_TITLE_HOVER
											)}
											style={{ width: TITLE_WIDTH }}
											aria-label={label}
											title={label}
										>
											{bar.outside === 'before' ? (
												<span
													aria-hidden="true"
													className="shrink-0 text-muted-foreground"
													data-testid={`timeline-title-before-${task.id}`}
												>
													‹
												</span>
											) : null}
											{task.number ? (
												<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
													#{task.number}
												</span>
											) : null}
											<span className="truncate">{task.title}</span>
											{/* The edge marker can be far from the days in view: the title says where the dates are too. */}
											{bar.outside === 'after' ? (
												<span
													aria-hidden="true"
													className="ml-auto shrink-0 text-muted-foreground"
													data-testid={`timeline-title-after-${task.id}`}
												>
													›
												</span>
											) : null}
										</button>
										<div className="relative" style={{ width: calendarWidth }}>
											{bar.outside ? (
												<button
													type="button"
													onClick={() => commands.openTask(task.id)}
													aria-label={label}
													title={label}
													data-testid={`timeline-outside-${task.id}`}
													className={cn(
														'absolute top-1.5 flex items-center rounded-md px-1.5 text-xs font-medium text-muted-foreground outline-none hover:bg-foreground/[0.05] focus-visible:ring-[3px] focus-visible:ring-ring/40',
														bar.isOverdue && 'text-destructive'
													)}
													style={{
														...(bar.outside === 'before' ? { left: 0 } : { right: 0 }),
														height: ROW_HEIGHT - 12
													}}
												>
													<span aria-hidden="true">
														{bar.outside === 'before' ? '‹' : '›'}
													</span>
												</button>
											) : (
												<TimelineBar
													task={task}
													status={statusOfTask(task, view.statuses)}
													bar={bar}
													firstDay={firstDay}
													dayWidth={dayWidth}
													label={label}
													datesText={datesText}
													canEdit={teamTaskIds.has(task.id)}
													canHover={canHover}
													dragHintId={dragHintId}
													onOpen={() => commands.openTask(task.id)}
													dayCount={timeline.dayCount}
													scrollRef={scrollRef}
													onMove={(drag, delta) => moveDates(task.id, drag, delta)}
												/>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				</div>
			)}

			{hasUnscheduled && (
				<div
					className={cn(
						'flex shrink-0 flex-col gap-1.5 overflow-y-auto px-3 py-3 custom-scrollbar',
						hasBars && 'max-h-48 hairline-t border-border',
						!hasBars && 'min-h-0 flex-1'
					)}
					data-testid="timeline-unscheduled"
				>
					<h3 className="px-1 text-xs font-medium text-muted-foreground">
						{t('pages.teamTasks.TIMELINE_UNSCHEDULED', { count: timeline.unscheduledIds.length })}
					</h3>
					<ul className="flex flex-col">
						{timeline.unscheduledIds.map((id) => {
							const task = taskById.get(id);
							return task ? (
								<li key={id}>
									<button
										type="button"
										onClick={() => commands.openTask(id)}
										className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring/25"
									>
										{task.number ? (
											<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
												#{task.number}
											</span>
										) : null}
										<span className="truncate">{task.title}</span>
									</button>
								</li>
							) : null;
						})}
					</ul>
				</div>
			)}
		</section>
	);
}

/** A day's number in the week zoom's header: today on a primary disc, the weekends quieter. */
function DayNumber({
	date,
	label,
	left,
	width,
	isToday
}: Readonly<{ date: Date; label: string; left: number; width: number; isToday: boolean }>) {
	const isWeekend = isWeekendDay(date);
	return (
		<span
			className={cn(
				'absolute bottom-1 flex justify-center text-[10px] tabular-nums text-muted-foreground',
				isWeekend && 'text-muted-foreground/60'
			)}
			style={{ left, width }}
		>
			<span
				className={cn(
					isToday &&
						'flex size-4.5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground'
				)}
				data-today={isToday}
			>
				{label}
			</span>
		</span>
	);
}

/** Movement, in pixels, before a press on a bar counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

/** The narrowest bar that shows its end handles (6 px each) and keeps a middle to move it by. */
const MIN_HANDLE_BAR_WIDTH = 24;

/** Days from a movement in days, half a day rounding away from zero in both directions alike. */
function wholeDaysOf(days: number) {
	return Math.sign(days) * Math.round(Math.abs(days));
}

interface TimelineBarDragPress {
	drag: TeamTasksTimelineDrag;
	x: number;
	lastX: number;
	scrollLeft: number;
	pointerId: number;
	moved: boolean;
}

/**
 * The pointer side of a bar: a press that moves (the pointer, or the calendar scrolled under it) past the threshold is
 * a drag, shown as `preview` by whole days and sent once, on release, through `onMove`; a press that does not is a
 * click. The calendar's scroll counts from the press on, so a held bar moved by a wheel or a trackpad drags too.
 */
function useTimelineBarDrag({
	canEdit,
	dayWidth,
	scrollRef,
	onMove
}: {
	canEdit: boolean;
	dayWidth: number;
	scrollRef: RefObject<HTMLDivElement | null>;
	onMove: (drag: TeamTasksTimelineDrag, deltaDays: number) => void;
}) {
	const [preview, setPreview] = useState<{ drag: TeamTasksTimelineDrag; delta: number } | null>(null);
	const [isPressed, setPressed] = useState(false);
	const pressRef = useRef<TimelineBarDragPress | null>(null);
	const suppressClickRef = useRef(false);

	/** The movement of a press in pixels: the pointer's, plus the calendar scrolled since the press. */
	const movementOf = useCallback(
		(press: TimelineBarDragPress) => {
			const scrolled = (scrollRef.current?.scrollLeft ?? press.scrollLeft) - press.scrollLeft;
			return press.lastX - press.x + scrolled;
		},
		[scrollRef]
	);
	/** Marks a press as a drag once it moved past the threshold, and shows where it would put the bar. */
	const follow = useCallback(
		(press: TimelineBarDragPress) => {
			const movement = movementOf(press);
			if (!press.moved && Math.abs(movement) < DRAG_THRESHOLD) {
				return;
			}
			press.moved = true;
			setPreview({ drag: press.drag, delta: wholeDaysOf(movement / dayWidth) });
		},
		[movementOf, dayWidth]
	);

	useEffect(() => {
		const element = scrollRef.current;
		if (!element || !isPressed) {
			return;
		}
		const onScroll = () => {
			if (pressRef.current) follow(pressRef.current);
		};
		element.addEventListener('scroll', onScroll);
		return () => element.removeEventListener('scroll', onScroll);
	}, [isPressed, scrollRef, follow]);

	const end = () => {
		pressRef.current = null;
		setPressed(false);
		setPreview(null);
	};

	const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
		// The pointer that pressed first owns the press: another touch on the bar meanwhile changes nothing.
		if (pressRef.current) {
			return;
		}
		// A new press: the click of an earlier drag came, or never will (some browsers send none after a touch drag).
		suppressClickRef.current = false;
		if (!canEdit || event.button !== 0) {
			return;
		}
		const handle = (event.target as HTMLElement).dataset['handle'];
		pressRef.current = {
			drag: handle === 'start' || handle === 'end' ? handle : 'move',
			x: event.clientX,
			lastX: event.clientX,
			scrollLeft: scrollRef.current?.scrollLeft ?? 0,
			pointerId: event.pointerId,
			moved: false
		};
		setPressed(true);
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};
	const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
		const press = pressRef.current;
		if (press?.pointerId !== event.pointerId) {
			return;
		}
		press.lastX = event.clientX;
		follow(press);
	};
	const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
		const press = pressRef.current;
		if (press?.pointerId !== event.pointerId) {
			return;
		}
		press.lastX = event.clientX;
		follow(press);
		const delta = wholeDaysOf(movementOf(press) / dayWidth);
		event.currentTarget.releasePointerCapture?.(event.pointerId);
		end();
		if (!press.moved) {
			return;
		}
		// A drag is not a click: the button's click that follows the release does not open the task.
		suppressClickRef.current = true;
		if (delta !== 0) onMove(press.drag, delta);
	};
	/** Only the pointer that owns the press cancels it. */
	const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
		if (pressRef.current?.pointerId === event.pointerId) end();
	};
	/** Whether the click that follows was a drag's release (and so opens nothing). */
	const takeDragClick = () => {
		const wasDrag = suppressClickRef.current;
		suppressClickRef.current = false;
		return wasDrag;
	};
	/** A key was pressed on the bar: a click from it is the keyboard's, never a drag's. */
	const forgetDragClick = () => {
		suppressClickRef.current = false;
	};

	return {
		preview,
		isPressed,
		handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
		takeDragClick,
		forgetDragClick
	};
}

interface TimelineBarProps {
	task: TTask;
	status: TTaskStatus | undefined;
	bar: TeamTasksTimelineBar;
	firstDay: number;
	dayWidth: number;
	label: string;
	/** The task's dates and what is particular about them, for the card. */
	datesText: string;
	canEdit: boolean;
	/** Whether the pointer hovers (a mouse): the card shows only then. */
	canHover: boolean;
	/** The element that says how to move a bar's dates, read out with the bars that can move. */
	dragHintId: string;
	onOpen: () => void;
	/** The days drawn: a dragged bar stays inside them, as `timelineOf` keeps every bar. */
	dayCount: number;
	/** The calendar's scroll area: a drag counts the calendar scrolled under the pointer too. */
	scrollRef: RefObject<HTMLDivElement | null>;
	onMove: (drag: TeamTasksTimelineDrag, deltaDays: number) => void;
}

/** A bar of one date only, or of a due date before its start: drawn with a dashed outline. */
function isSingleDateBar(bar: TeamTasksTimelineBar) {
	return [bar.isDueOnly, bar.isStartOnly, bar.hasInvalidRange].some(Boolean);
}

/**
 * One bar: a button that opens its task, in the colour of its status (a soft tint and a stripe, as the calendar's
 * tasks), with the status glyph, the title and the faces of its people as far as its width allows. Hovering it with a
 * mouse, a card says the rest. With `canEdit`, dragged to move the task's dates (the body) or one end of a range (the
 * edges), or moved with Alt + arrows (Alt + Shift + arrows: the due date). The bar follows the pointer by whole days
 * while dragged; the move is sent once, when it is let go, and the dates are worked out from the latest task when the
 * update runs (a move that turns out to change nothing then sends nothing).
 */
function TimelineBar({
	task,
	status,
	bar,
	firstDay,
	dayWidth,
	label,
	datesText,
	canEdit,
	canHover,
	dragHintId,
	onOpen,
	dayCount,
	scrollRef,
	onMove
}: Readonly<TimelineBarProps>) {
	const { preview, isPressed, handlers, takeDragClick, forgetDragClick } = useTimelineBarDrag({
		canEdit,
		dayWidth,
		scrollRef,
		onMove
	});
	const [isCardOpen, setIsCardOpen] = useState(false);
	// A press (a click or a drag) keeps the card closed until the pointer leaves the bar: it was no wish to read it.
	const isCardHeldRef = useRef(false);
	const dates = useMemo(
		() => ({ startDay: dayOfStoredDate(task.startDate), dueDay: dayOfStoredDate(task.dueDate) }),
		[task.startDate, task.dueDate]
	);
	const { startDay, endDay } = previewDaysOf(bar, dates, preview, firstDay, dayCount);
	const left = startDay * dayWidth;
	const width = Math.max(dayWidth, (endDay - startDay + 1) * dayWidth);
	// The ends drag on a range of several days wide enough to leave its middle to move it; a one-day or narrow bar
	// moves as a whole.
	const hasHandles = canEdit && hasEndHandlesOf(bar, dates) && width >= MIN_HANDLE_BAR_WIDTH;
	const isDone = isDoneStatus(status);
	const people = useMemo(() => peopleOfTask(task), [task]);
	const showsGlyph = width >= GLYPH_MIN_WIDTH;
	const showsTitle = width >= TITLE_MIN_WIDTH;
	const showsPeople = width >= PEOPLE_MIN_WIDTH && people.length > 0;
	// A press or a drag hides the card: it would cover the days the bar is dragged over.
	const isCardShown = canHover && isCardOpen && !isPressed;

	const handleCardOpenChange = (isOpen: boolean, eventDetails: { reason: string }) => {
		const isHeld = isOpen && isCardHeldRef.current;
		const isByFocus = isFocusOpening(isOpen, eventDetails.reason);
		const isRefused = isHeld || isByFocus;
		if (isRefused) {
			return;
		}
		setIsCardOpen(isOpen);
	};
	const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
		isCardHeldRef.current = true;
		setIsCardOpen(false);
		handlers.onPointerDown(event);
	};
	const handlePointerLeave = () => {
		isCardHeldRef.current = false;
	};
	const handleClick = () => {
		setIsCardOpen(false);
		if (!takeDragClick()) onOpen();
	};
	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		forgetDragClick();
		if (!canEdit || !event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
			return;
		}
		event.preventDefault();
		// Alt + Shift: the due date. A task with a due date only moves that date (its one date). The move always goes
		// to the queue: whether it changes the dates is decided there, on the latest task.
		onMove(event.shiftKey && !bar.isDueOnly ? 'end' : 'move', event.key === 'ArrowLeft' ? -1 : 1);
	};

	const statusColor = status?.color ?? null;
	const tone = entryToneStyle(statusColor);
	const barHeight = ROW_HEIGHT - 12;
	const showsStartHandle = hasHandles && !bar.isClippedStart;
	const showsEndHandle = hasHandles && !bar.isClippedEnd;
	// What a bar of the active team's task does with the keyboard, and how its dates move, for screen readers.
	let keyShortcuts: string | undefined;
	let describedBy: string | undefined;
	if (canEdit) {
		keyShortcuts = 'Alt+ArrowLeft Alt+ArrowRight Alt+Shift+ArrowLeft Alt+Shift+ArrowRight';
		describedBy = dragHintId;
	}
	const barProps = {
		type: 'button' as const,
		onClick: handleClick,
		...handlers,
		onPointerDown: handlePointerDown,
		onPointerLeave: handlePointerLeave,
		onKeyDown: handleKeyDown,
		'aria-label': label,
		'aria-describedby': describedBy,
		'aria-keyshortcuts': keyShortcuts,
		'data-testid': `timeline-bar-${task.id}`,
		className: cn(
			'absolute top-1.5 flex items-center gap-1.5 overflow-hidden rounded-[5px] pr-1 pl-2 text-left text-xs font-medium text-foreground outline-none hairline-ring ring-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_[data-slot=task-property-icon]]:size-3 [&_[data-slot=task-property-icon]]:shrink-0',
			ENTRY_SOLID,
			bar.isOverdue && 'ring-destructive/45',
			isSingleDateBar(bar) && 'border border-dashed border-foreground/25',
			bar.isClippedStart && 'rounded-l-none',
			bar.isClippedEnd && 'rounded-r-none',
			canEdit && 'cursor-grab touch-none active:cursor-grabbing',
			preview && 'z-10 shadow-sm'
		),
		style: { ...tone, left, width, height: barHeight }
	};
	// The handles come after the stripe and around the title and faces, which take no pointer: on top without a
	// stacking order of their own, so the sticky title column still covers them when the calendar is scrolled.
	const barContent = (
		<>
			<span className={cn(ENTRY_BAR, 'pointer-events-none')} />
			{showsStartHandle && (
				<span
					data-handle="start"
					aria-hidden="true"
					className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
				/>
			)}
			{showsGlyph && (
				<span className="pointer-events-none flex shrink-0">
					<StatusGlyph status={status} />
				</span>
			)}
			{showsTitle && (
				<span
					className={cn(
						'pointer-events-none min-w-0 flex-1 truncate',
						isDone && 'text-muted-foreground line-through',
						bar.isOverdue && 'text-destructive-ink'
					)}
				>
					{task.title}
				</span>
			)}
			{showsPeople && <BarPeople people={people} />}
			{showsEndHandle && (
				<span
					data-handle="end"
					aria-hidden="true"
					className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
				/>
			)}
		</>
	);

	// Where nothing hovers (a touch screen) a bar carries no card at all, so it sets up none of its machinery.
	if (!canHover) {
		return <button {...barProps}>{barContent}</button>;
	}

	return (
		<HoverCard
			open={isCardShown}
			onOpenChange={handleCardOpenChange}
			openDelay={CARD_OPEN_DELAY}
			closeDelay={CARD_CLOSE_DELAY}
		>
			<HoverCardTrigger render={<button {...barProps} />}>{barContent}</HoverCardTrigger>
			{isCardShown && (
				<HoverCardContent side="bottom" align="start" sideOffset={6} collisionPadding={12} className="w-72 p-3">
					<TimelineTaskCard
						task={task}
						status={status}
						dates={datesText}
						isOverdue={bar.isOverdue}
						canEdit={canEdit}
					/>
				</HoverCardContent>
			)}
		</HoverCard>
	);
}
