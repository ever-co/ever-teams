'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { isDoneStatus, statusOfTask, tasksOfGroups } from '@/core/lib/utils/team-tasks-view';
import {
	TIMELINE_DAY_WIDTH,
	dateOfDayNumber,
	dayNumberOf,
	ticksOf,
	timelineOf,
	type TeamTasksTimelineBar,
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
 * calendar. A bar opens its task, as a row does; the calendar opens on today.
 */
export function TeamTasksTimelineView({
	view,
	commands
}: Readonly<{ view: TeamTasksViewState; commands: TeamTasksListCommands }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [zoom, setZoom] = useState<TeamTasksTimelineZoom>('week');
	const [today] = useState(() => new Date());
	const scrollRef = useRef<HTMLDivElement>(null);
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

	const barLabel = (task: TTask, bar: TeamTasksTimelineBar) => {
		const start = formats.day.format(dateOfDayNumber(firstDay + bar.startDay));
		const end = formats.day.format(dateOfDayNumber(firstDay + bar.endDay));
		const dates = bar.startDay === bar.endDay ? start : t('pages.teamTasks.TIMELINE_RANGE', { start, end });
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
		<section aria-label={t('pages.teamTasks.LAYOUT_TIMELINE')} className="flex min-h-0 flex-1 flex-col gap-3" data-testid="team-tasks-timeline">
			<div className="flex items-center justify-end gap-1" role="group" aria-label={t('pages.teamTasks.TIMELINE_ZOOM')}>
				{ZOOMS.map((each) => (
					<button
						key={each}
						type="button"
						aria-pressed={zoom === each}
						onClick={() => setZoom(each)}
						className={cn(
							'h-7 rounded-md px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25',
							zoom === each ? 'bg-foreground/[0.08] text-foreground' : 'text-muted-foreground hover:bg-foreground/[0.05]'
						)}
					>
						{t(each === 'week' ? 'pages.teamTasks.TIMELINE_ZOOM_WEEKS' : 'pages.teamTasks.TIMELINE_ZOOM_MONTHS')}
					</button>
				))}
			</div>

			{!hasTasks && <p className="px-1 text-sm text-muted-foreground">{t('pages.teamTasks.TIMELINE_EMPTY')}</p>}

			{timeline.bars.length > 0 && (
				<div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto rounded-lg border border-border">
					<div className="relative" style={{ width: TITLE_WIDTH + calendarWidth }}>
						{/* The header: month or week labels over the days. */}
						<div className="sticky top-0 z-20 flex border-b border-border bg-background" style={{ height: HEADER_HEIGHT }}>
							<div className="sticky left-0 z-30 shrink-0 border-r border-border bg-background" style={{ width: TITLE_WIDTH }} />
							<div className="relative" style={{ width: calendarWidth }} aria-hidden="true">
								{ticks.map((tick) =>
									tick.isMajor ? (
										<span
											key={tick.day}
											className="absolute top-1.5 whitespace-nowrap pl-1 text-xs font-medium text-foreground"
											style={{ left: tick.day * dayWidth }}
										>
											{zoom === 'week' ? formats.day.format(tick.date) : formats.month.format(tick.date)}
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
						<div className="pointer-events-none absolute bottom-0" style={{ left: TITLE_WIDTH, top: HEADER_HEIGHT, width: calendarWidth }} aria-hidden="true">
							{ticks
								.filter((tick) => tick.isMajor)
								.map((tick) => (
									<span key={tick.day} className="absolute inset-y-0 w-px bg-border" style={{ left: tick.day * dayWidth }} />
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
								const left = bar.startDay * dayWidth;
								const width = Math.max(dayWidth, (bar.endDay - bar.startDay + 1) * dayWidth);
								return (
									<li key={bar.taskId} className="flex border-b border-border/60" style={{ height: ROW_HEIGHT }}>
										<button
											type="button"
											onClick={() => commands.openTask(task.id)}
											className="sticky left-0 z-10 flex shrink-0 items-center gap-2 truncate border-r border-border bg-background px-3 text-left text-sm outline-none hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25"
											style={{ width: TITLE_WIDTH }}
											title={task.title}
										>
											{task.number ? (
												<span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{task.number}</span>
											) : null}
											<span className="truncate">{task.title}</span>
										</button>
										<div className="relative" style={{ width: calendarWidth }}>
											<button
												type="button"
												onClick={() => commands.openTask(task.id)}
												aria-label={label}
												title={label}
												data-testid={`timeline-bar-${task.id}`}
												className={cn(
													'absolute top-1.5 flex items-center overflow-hidden rounded-md px-1.5 text-left text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
													bar.isOverdue
														? 'bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/40'
														: 'bg-primary/15 text-foreground ring-1 ring-inset ring-primary/30',
													(bar.isDueOnly || bar.isStartOnly || bar.hasInvalidRange) && 'border border-dashed border-current',
													bar.isClippedStart && 'rounded-l-none',
													bar.isClippedEnd && 'rounded-r-none'
												)}
												style={{ left, width, height: ROW_HEIGHT - 12 }}
											>
												{width >= 64 ? <span className="truncate">{task.title}</span> : null}
											</button>
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
										{task.number ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{task.number}</span> : null}
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
