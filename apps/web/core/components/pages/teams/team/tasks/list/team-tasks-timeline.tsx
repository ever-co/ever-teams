'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { useTeamTaskUpdates } from '@/core/hooks/tasks/use-team-task-updates';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { tasksByTeamState } from '@/core/stores';
import { isDoneStatus, statusOfTask, tasksOfGroups } from '@/core/lib/utils/team-tasks-view';
import {
	TIMELINE_DAY_WIDTH,
	dateOfDayNumber,
	dayNumberOf,
	dayOfStoredDate,
	draggedDatesOf,
	ticksOf,
	timelineOf,
	type TeamTasksTimelineBar,
	type TeamTasksTimelineDrag,
	type TeamTasksTimelineZoom
} from '@/core/lib/utils/team-tasks-timeline';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TeamTasksListCommands } from './team-tasks-list';

const TITLE_WIDTH = 260;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 44;
const ZOOMS: TeamTasksTimelineZoom[] = ['week', 'month'];

/**
 * A view shown as a timeline (its layout): the tasks the view lists, with its filters, scope, search and ordering, one
 * row each, as a bar from the task's start date to its due date on a calendar of days. A task with a due date only is
 * one day at its due date; a start date only, one day at its start. The tasks with neither date are listed under the
 * calendar. A bar opens its task, as a row does; the calendar opens on today. A task of the active team changes its
 * dates from its bar: dragged (the whole bar, or either end of a range) or with Alt + arrows (Alt + Shift + arrows for
 * the due date); a task of another team (a built-in view lists the person's tasks of every team) only opens.
 */
export function TeamTasksTimelineView({
	view,
	commands
}: Readonly<{ view: TeamTasksViewState; commands: TeamTasksListCommands }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [zoom, setZoom] = useState<TeamTasksTimelineZoom>('week');
	const today = useToday();
	const scrollRef = useRef<HTMLDivElement>(null);
	const { setDates } = useTeamTaskUpdates();
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
	const dayWidth = TIMELINE_DAY_WIDTH[zoom];
	const calendarWidth = timeline.dayCount * dayWidth;
	const firstDay = dayNumberOf(timeline.firstDay);

	// The calendar opens on today (a third from the left), and again when the zoom changes.
	const todayDay = timeline.todayDay;
	useEffect(() => {
		const element = scrollRef.current;
		if (!element || todayDay === null) {
			return;
		}
		element.scrollLeft = Math.max(0, todayDay * dayWidth - (element.clientWidth - TITLE_WIDTH) / 3);
	}, [todayDay, dayWidth]);

	// The task's own dates (never the calendar's edges a long bar is cut at), with the year when it is not this one.
	const barLabel = (task: TTask, bar: TeamTasksTimelineBar) => {
		const day = (value: number) => {
			const date = dateOfDayNumber(value);
			return (date.getFullYear() === today.getFullYear() ? formats.day : formats.dayWithYear).format(date);
		};
		const { taskStartDay, taskDueDay } = bar;
		let dates = '';
		if (taskStartDay !== null && taskDueDay !== null && taskStartDay !== taskDueDay) {
			dates = t('pages.teamTasks.TIMELINE_RANGE', { start: day(taskStartDay), end: day(taskDueDay) });
		} else if (taskDueDay !== null) {
			dates = day(taskDueDay);
		} else if (taskStartDay !== null) {
			dates = day(taskStartDay);
		}
		const notes = [
			bar.isDueOnly ? t('pages.teamTasks.TIMELINE_DUE_ONLY') : null,
			bar.isStartOnly ? t('pages.teamTasks.TIMELINE_START_ONLY') : null,
			bar.hasInvalidRange ? t('pages.teamTasks.TIMELINE_INVALID_RANGE') : null,
			bar.isOverdue ? t('pages.teamTasks.TIMELINE_OVERDUE') : null
		].filter(Boolean);
		return [task.title, dates, ...notes].join(' · ');
	};

	const hasTasks = timeline.bars.length > 0 || timeline.unscheduledIds.length > 0;

	return (
		<section
			aria-label={t('pages.teamTasks.LAYOUT_TIMELINE')}
			className="flex min-h-0 flex-1 flex-col gap-3"
			data-testid="team-tasks-timeline"
		>
			<div
				className="flex items-center justify-end gap-1"
				role="group"
				aria-label={t('pages.teamTasks.TIMELINE_ZOOM')}
			>
				{ZOOMS.map((each) => (
					<button
						key={each}
						type="button"
						aria-pressed={zoom === each}
						onClick={() => setZoom(each)}
						className={cn(
							'h-7 rounded-md px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25',
							zoom === each
								? 'bg-foreground/[0.08] text-foreground'
								: 'text-muted-foreground hover:bg-foreground/[0.05]'
						)}
					>
						{t(
							each === 'week'
								? 'pages.teamTasks.TIMELINE_ZOOM_WEEKS'
								: 'pages.teamTasks.TIMELINE_ZOOM_MONTHS'
						)}
					</button>
				))}
			</div>

			{!hasTasks && <p className="px-1 text-sm text-muted-foreground">{t('pages.teamTasks.TIMELINE_EMPTY')}</p>}

			{timeline.bars.length > 0 && (
				<div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto rounded-lg border border-border">
					<div className="relative" style={{ width: TITLE_WIDTH + calendarWidth }}>
						{/* The header: month or week labels over the days. */}
						<div
							className="sticky top-0 z-20 flex border-b border-border bg-background"
							style={{ height: HEADER_HEIGHT }}
						>
							<div
								className="sticky left-0 z-30 shrink-0 border-r border-border bg-background"
								style={{ width: TITLE_WIDTH }}
							/>
							<div className="relative" style={{ width: calendarWidth }} aria-hidden="true">
								{ticks.map((tick) =>
									tick.isMajor ? (
										<span
											key={tick.day}
											className="absolute top-1.5 whitespace-nowrap pl-1 text-xs font-medium text-foreground"
											style={{ left: tick.day * dayWidth }}
										>
											{zoom === 'week'
												? formats.day.format(tick.date)
												: formats.month.format(tick.date)}
										</span>
									) : null
								)}
								{zoom === 'week' &&
									ticks.map((tick) => (
										<span
											key={`d${tick.day}`}
											className="absolute bottom-1 text-center text-[10px] tabular-nums text-muted-foreground"
											style={{ left: tick.day * dayWidth, width: dayWidth }}
										>
											{formats.dayOfMonth.format(tick.date)}
										</span>
									))}
							</div>
						</div>

						{/* Lines of the weeks or months, and today, behind the rows. */}
						<div
							className="pointer-events-none absolute bottom-0"
							style={{ left: TITLE_WIDTH, top: HEADER_HEIGHT, width: calendarWidth }}
							aria-hidden="true"
						>
							{ticks
								.filter((tick) => tick.isMajor)
								.map((tick) => (
									<span
										key={tick.day}
										className="absolute inset-y-0 w-px bg-border"
										style={{ left: tick.day * dayWidth }}
									/>
								))}
							{todayDay !== null && (
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
								const label = barLabel(task, bar);
								return (
									<li
										key={bar.taskId}
										className="flex border-b border-border/60"
										style={{ height: ROW_HEIGHT }}
									>
										<button
											type="button"
											onClick={() => commands.openTask(task.id)}
											className="sticky left-0 z-10 flex shrink-0 items-center gap-2 truncate border-r border-border bg-background px-3 text-left text-sm outline-none hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25"
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
													bar={bar}
													firstDay={firstDay}
													dayWidth={dayWidth}
													label={label}
													hint={t('pages.teamTasks.TIMELINE_DRAG_HINT')}
													canEdit={teamTaskIds.has(task.id)}
													onOpen={() => commands.openTask(task.id)}
													onDates={(dates) => setDates(task.id, dates)}
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

			{timeline.unscheduledIds.length > 0 && (
				<div className="flex flex-col gap-1.5" data-testid="timeline-unscheduled">
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

/** Movement, in pixels, before a press on a bar counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

interface TimelineBarProps {
	task: TTask;
	bar: TeamTasksTimelineBar;
	firstDay: number;
	dayWidth: number;
	label: string;
	hint: string;
	canEdit: boolean;
	onOpen: () => void;
	onDates: (dates: { startDate?: Date | null; dueDate?: Date | null }) => void;
}

/**
 * One bar: a button that opens its task; with `canEdit`, dragged to move the task's dates (the body) or one end of a
 * range (the edges), or moved with Alt + arrows (Alt + Shift + arrows: the due date). The bar follows the pointer by
 * whole days while dragged; the dates are saved once, when it is let go.
 */
function TimelineBar({
	task,
	bar,
	firstDay,
	dayWidth,
	label,
	hint,
	canEdit,
	onOpen,
	onDates
}: Readonly<TimelineBarProps>) {
	const [preview, setPreview] = useState<{ drag: TeamTasksTimelineDrag; delta: number } | null>(null);
	const pressRef = useRef<{ drag: TeamTasksTimelineDrag; x: number; pointerId: number; moved: boolean } | null>(null);
	const suppressClickRef = useRef(false);
	const dates = useMemo(
		() => ({ startDay: dayOfStoredDate(task.startDate), dueDay: dayOfStoredDate(task.dueDate) }),
		[task.startDate, task.dueDate]
	);
	const hasRange = !bar.isDueOnly && !bar.isStartOnly && !bar.hasInvalidRange;

	const save = (drag: TeamTasksTimelineDrag, delta: number) => {
		const next = draggedDatesOf(bar, dates, drag, delta);
		if (!next) {
			return;
		}
		onDates({
			...(next.startDay === undefined ? {} : { startDate: dateOfDayNumber(next.startDay) }),
			...(next.dueDay === undefined ? {} : { dueDate: dateOfDayNumber(next.dueDay) })
		});
	};

	// Where the bar shows: its dates as dragged so far, else as stored (a clipped end stays at the edge).
	let startDay = bar.startDay;
	let endDay = bar.endDay;
	if (preview) {
		const next = draggedDatesOf(bar, dates, preview.drag, preview.delta);
		if (next) {
			const start = (next.startDay ?? dates.startDay ?? next.dueDay ?? dates.dueDay ?? 0) - firstDay;
			const end = (next.dueDay ?? dates.dueDay ?? next.startDay ?? dates.startDay ?? 0) - firstDay;
			startDay = start;
			endDay = bar.hasInvalidRange ? start : Math.max(start, end);
		}
	}
	const left = startDay * dayWidth;
	const width = Math.max(dayWidth, (endDay - startDay + 1) * dayWidth);

	const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
		if (!canEdit || event.button !== 0) {
			return;
		}
		const handle = (event.target as HTMLElement).dataset['handle'];
		const drag: TeamTasksTimelineDrag = handle === 'start' || handle === 'end' ? handle : 'move';
		pressRef.current = { drag, x: event.clientX, pointerId: event.pointerId, moved: false };
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};
	const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
		const press = pressRef.current;
		if (!press || press.pointerId !== event.pointerId) {
			return;
		}
		const dx = event.clientX - press.x;
		if (!press.moved && Math.abs(dx) < DRAG_THRESHOLD) {
			return;
		}
		press.moved = true;
		setPreview({ drag: press.drag, delta: Math.round(dx / dayWidth) });
	};
	const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
		const press = pressRef.current;
		pressRef.current = null;
		if (!press || press.pointerId !== event.pointerId) {
			return;
		}
		event.currentTarget.releasePointerCapture?.(event.pointerId);
		setPreview(null);
		if (!press.moved) {
			return;
		}
		// A drag is not a click: the button's click that follows the release does not open the task.
		suppressClickRef.current = true;
		save(press.drag, Math.round((event.clientX - press.x) / dayWidth));
	};
	const handlePointerCancel = () => {
		pressRef.current = null;
		setPreview(null);
	};
	const handleClick = () => {
		if (suppressClickRef.current) {
			suppressClickRef.current = false;
			return;
		}
		onOpen();
	};
	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (!canEdit || !event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
			return;
		}
		event.preventDefault();
		const delta = event.key === 'ArrowLeft' ? -1 : 1;
		save(event.shiftKey ? 'end' : 'move', delta);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerCancel}
			onKeyDown={handleKeyDown}
			aria-label={label}
			aria-keyshortcuts={
				canEdit ? 'Alt+ArrowLeft Alt+ArrowRight Alt+Shift+ArrowLeft Alt+Shift+ArrowRight' : undefined
			}
			title={canEdit ? `${label}\n${hint}` : label}
			data-testid={`timeline-bar-${task.id}`}
			className={cn(
				'absolute top-1.5 flex items-center overflow-hidden rounded-md px-1.5 text-left text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
				bar.isOverdue
					? 'bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/40'
					: 'bg-primary/15 text-foreground ring-1 ring-inset ring-primary/30',
				(bar.isDueOnly || bar.isStartOnly || bar.hasInvalidRange) && 'border border-dashed border-current',
				bar.isClippedStart && 'rounded-l-none',
				bar.isClippedEnd && 'rounded-r-none',
				canEdit && 'cursor-grab touch-none active:cursor-grabbing',
				preview && 'z-10 shadow-sm'
			)}
			style={{ left, width, height: ROW_HEIGHT - 12 }}
		>
			{canEdit && hasRange && !bar.isClippedStart ? (
				<span
					data-handle="start"
					aria-hidden="true"
					className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
				/>
			) : null}
			{width >= 64 ? <span className="pointer-events-none truncate">{task.title}</span> : null}
			{canEdit && hasRange && !bar.isClippedEnd ? (
				<span
					data-handle="end"
					aria-hidden="true"
					className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
				/>
			) : null}
		</button>
	);
}

/**
 * Today, kept current: it moves at local midnight and when the tab comes back after the day changed (a timer of a
 * sleeping tab can run late), so the today line and the overdue marks never stay on yesterday.
 */
function useToday() {
	const [today, setToday] = useState(() => new Date());
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			setToday((current) => {
				const now = new Date();
				return dayNumberOf(now) === dayNumberOf(current) ? current : now;
			});
		};
		const schedule = () => {
			const now = new Date();
			const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			timer = setTimeout(
				() => {
					refresh();
					schedule();
				},
				nextMidnight.getTime() - now.getTime() + 1000
			);
		};
		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		schedule();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			if (timer) clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, []);
	return today;
}
