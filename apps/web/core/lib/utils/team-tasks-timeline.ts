/**
 * The timeline layout of a view: each task as a bar from its start date to its due date on a calendar of days, the
 * tasks without either date apart. Pure: the component draws what this answers.
 *
 * Days are the reader's calendar days (a due date is a day, not a moment), counted from a fixed epoch so two dates
 * subtract to a whole number of days whatever the daylight-saving changes in between.
 */

/** How wide one day is drawn, per zoom. */
export type TeamTasksTimelineZoom = 'week' | 'month';

export const TIMELINE_DAY_WIDTH: Record<TeamTasksTimelineZoom, number> = { week: 36, month: 10 };

/** Days shown before the earliest bar and after the latest one (or today), so no bar touches an edge. */
export const TIMELINE_PADDING_DAYS: Record<TeamTasksTimelineZoom, number> = { week: 3, month: 7 };

/** The longest calendar drawn: a task dated years away does not stretch the page past this. */
export const TIMELINE_MAX_DAYS = 3 * 366;

export interface TeamTasksTimelineTask {
	id: string;
	startDate?: Date | string | null;
	dueDate?: Date | string | null;
	isDone: boolean;
}

export interface TeamTasksTimelineBar {
	taskId: string;
	/** Day offsets from the first day drawn, both included (clamped to the days drawn). */
	startDay: number;
	endDay: number;
	/** The task's own dates as day numbers (never clamped): what its label says. */
	taskStartDay: number | null;
	taskDueDay: number | null;
	/**
	 * The bar lies wholly before or after the days drawn (the calendar was capped): no bar is drawn, only a marker at
	 * that edge, and the task keeps its row.
	 */
	outside: 'before' | 'after' | null;
	/** The task has a due date only: one day, at its due date. */
	isDueOnly: boolean;
	/** The task has a start date only: one day, at its start, with no end known. */
	isStartOnly: boolean;
	/** The due date came before the start date: drawn as one day at the start. */
	hasInvalidRange: boolean;
	/** Due before today and not done (by the task's own due date, also when it comes before the start). */
	isOverdue: boolean;
	/** The bar starts before the first day drawn, or ends after the last one (the calendar was capped). */
	isClippedStart: boolean;
	isClippedEnd: boolean;
}

export interface TeamTasksTimeline {
	/** The first day drawn (local midnight). */
	firstDay: Date;
	/** How many days are drawn. */
	dayCount: number;
	/** Today's offset, or null when today is outside the days drawn. */
	todayDay: number | null;
	/** The tasks with a date, in the view's order. */
	bars: TeamTasksTimelineBar[];
	/** The tasks with neither date, in the view's order. */
	unscheduledIds: string[];
}

export interface TeamTasksTimelineTick {
	day: number;
	date: Date;
	/** The first day of a week (Monday) in the week zoom, of a month in the month zoom: labelled. */
	isMajor: boolean;
}

const DAY_MS = 86_400_000;

/** A calendar day of the reader, as a whole number of days. */
export function dayNumberOf(date: Date): number {
	return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** The local midnight of a day number. */
export function dateOfDayNumber(day: number): Date {
	const utc = new Date(day * DAY_MS);
	return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/**
 * A stored date as a day number. A bare `YYYY-MM-DD` and a date at midnight UTC name a day (the way a due date is
 * stored): that day, whatever the reader's zone. Any other moment is the reader's calendar day of that moment.
 */
export function dayOfStoredDate(value: Date | string | null | undefined): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	if (typeof value === 'string') {
		const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		if (bare) {
			return Math.round(Date.UTC(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3])) / DAY_MS);
		}
	}
	const date = value instanceof Date ? value : new Date(value);
	const time = date.getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	const isUtcMidnight =
		date.getUTCHours() === 0 &&
		date.getUTCMinutes() === 0 &&
		date.getUTCSeconds() === 0 &&
		date.getUTCMilliseconds() === 0;
	if (isUtcMidnight) {
		return Math.round(time / DAY_MS);
	}
	return dayNumberOf(date);
}

interface DatedTask {
	task: TeamTasksTimelineTask;
	start: number;
	end: number;
	taskStart: number | null;
	taskDue: number | null;
	isDueOnly: boolean;
	isStartOnly: boolean;
	hasInvalidRange: boolean;
}

function datedTaskOf(task: TeamTasksTimelineTask): DatedTask | null {
	const start = dayOfStoredDate(task.startDate);
	const due = dayOfStoredDate(task.dueDate);
	if (start === null && due === null) {
		return null;
	}
	const own = { taskStart: start, taskDue: due };
	if (start === null) {
		return {
			task,
			...own,
			start: due as number,
			end: due as number,
			isDueOnly: true,
			isStartOnly: false,
			hasInvalidRange: false
		};
	}
	if (due === null) {
		return { task, ...own, start, end: start, isDueOnly: false, isStartOnly: true, hasInvalidRange: false };
	}
	if (due < start) {
		return { task, ...own, start, end: start, isDueOnly: false, isStartOnly: false, hasInvalidRange: true };
	}
	return { task, ...own, start, end: due, isDueOnly: false, isStartOnly: false, hasInvalidRange: false };
}

/**
 * The timeline of the tasks, in their order. The days drawn run from the earliest start (or today) to the latest end
 * (or today), padded, at most {@link TIMELINE_MAX_DAYS} days: past that, the calendar stays around today and the bars
 * outside it are clipped.
 */
export function timelineOf(
	tasks: readonly TeamTasksTimelineTask[],
	options: { today: Date; zoom: TeamTasksTimelineZoom }
): TeamTasksTimeline {
	const today = dayNumberOf(options.today);
	const padding = TIMELINE_PADDING_DAYS[options.zoom];
	const dated: DatedTask[] = [];
	const unscheduledIds: string[] = [];
	for (const task of tasks) {
		const datedTask = datedTaskOf(task);
		if (datedTask) {
			dated.push(datedTask);
		} else {
			unscheduledIds.push(task.id);
		}
	}

	let first = today;
	let last = today;
	for (const { start, end } of dated) {
		first = Math.min(first, start);
		last = Math.max(last, end);
	}
	first -= padding;
	last += padding;
	if (last - first + 1 > TIMELINE_MAX_DAYS) {
		// Keep today in view: as much before it as fits in a third of the calendar, the rest after it.
		const before = Math.min(today - first, Math.floor(TIMELINE_MAX_DAYS / 3));
		first = today - before;
		last = first + TIMELINE_MAX_DAYS - 1;
	}

	const bars = dated.map(({ task, start, end, taskStart, taskDue, isDueOnly, isStartOnly, hasInvalidRange }) => {
		let outside: TeamTasksTimelineBar['outside'] = null;
		if (end < first) outside = 'before';
		else if (start > last) outside = 'after';
		const edge = outside === 'before' ? 0 : last - first;
		return {
			taskId: task.id,
			startDay: outside ? edge : Math.max(start, first) - first,
			endDay: outside ? edge : Math.min(end, last) - first,
			taskStartDay: taskStart,
			taskDueDay: taskDue,
			outside,
			isDueOnly,
			isStartOnly,
			hasInvalidRange,
			isOverdue: !task.isDone && taskDue !== null && taskDue < today,
			isClippedStart: !outside && start < first,
			isClippedEnd: !outside && end > last
		};
	});

	return {
		firstDay: dateOfDayNumber(first),
		dayCount: last - first + 1,
		todayDay: today >= first && today <= last ? today - first : null,
		// Every dated task keeps its row; one wholly outside the capped calendar is marked at that edge.
		bars,
		unscheduledIds
	};
}

/** The days of the calendar with the ones the header labels: Mondays in the week zoom, the 1st in the month zoom. */
export function ticksOf(timeline: TeamTasksTimeline, zoom: TeamTasksTimelineZoom): TeamTasksTimelineTick[] {
	const first = dayNumberOf(timeline.firstDay);
	const ticks: TeamTasksTimelineTick[] = [];
	for (let day = 0; day < timeline.dayCount; day += 1) {
		const date = dateOfDayNumber(first + day);
		const isMajor = zoom === 'week' ? date.getDay() === 1 : date.getDate() === 1;
		ticks.push({ day, date, isMajor });
	}
	return ticks;
}

/** Room a header label takes, in pixels, per zoom (`Nov 9`; `November 2026`). */
export const TIMELINE_HEADER_LABEL_WIDTH: Record<TeamTasksTimelineZoom, number> = { week: 56, month: 120 };

/**
 * The days the header labels: the major ticks, and the first day drawn when the first major tick is further on than
 * a label's width (a month calendar within one month holds no first of a month, yet still says which month it is).
 */
export function labelledTicksOf(
	ticks: readonly TeamTasksTimelineTick[],
	dayWidth: number,
	labelWidth: number
): TeamTasksTimelineTick[] {
	const labelled = ticks.filter((tick) => tick.isMajor);
	if (ticks.length && (!labelled.length || labelled[0].day * dayWidth >= labelWidth)) {
		labelled.unshift(ticks[0]);
	}
	return labelled;
}

/** What a drag on a bar does: move the whole bar, or one of its ends. */
export type TeamTasksTimelineDrag = 'move' | 'start' | 'end';

export interface TeamTasksTimelineDates {
	/** The new start day, or undefined to leave it; null clears it (never produced by a drag). */
	startDay?: number;
	dueDay?: number;
}

/**
 * The dates a drag of `deltaDays` gives a bar, as day numbers. A move shifts the dates the task has (a due date only
 * moves its due date, a start date only its start); an end is dragged only on a bar with both dates, and never past
 * the other end. Nothing to change answers null.
 */
export function draggedDatesOf(
	bar: Pick<TeamTasksTimelineBar, 'isDueOnly' | 'isStartOnly' | 'hasInvalidRange'>,
	dates: { startDay: number | null; dueDay: number | null },
	drag: TeamTasksTimelineDrag,
	deltaDays: number
): TeamTasksTimelineDates | null {
	if (deltaDays === 0) {
		return null;
	}
	const { startDay, dueDay } = dates;
	if (drag === 'move') {
		const next: TeamTasksTimelineDates = {};
		if (startDay !== null) next.startDay = startDay + deltaDays;
		if (dueDay !== null) next.dueDay = dueDay + deltaDays;
		return next.startDay === undefined && next.dueDay === undefined ? null : next;
	}
	// Ends are for a real range: a one-day bar of a single date moves as a whole.
	if (startDay === null || dueDay === null || bar.hasInvalidRange) {
		return null;
	}
	if (drag === 'start') {
		const next = Math.min(startDay + deltaDays, dueDay);
		return next === startDay ? null : { startDay: next };
	}
	const next = Math.max(dueDay + deltaDays, startDay);
	return next === dueDay ? null : { dueDay: next };
}

/**
 * The dates a drag of `deltaDays` gives a task, read from the task's stored dates by the timeline's day rules (a bare
 * date and midnight UTC are that day) and written as local midnights, as the due-date picker writes them. Null when
 * the drag changes nothing (no movement, an end of a single date, an end already at the other).
 */
export function draggedTaskDatesOf(
	task: { startDate?: Date | string | null; dueDate?: Date | string | null },
	drag: TeamTasksTimelineDrag,
	deltaDays: number
): { startDate?: Date; dueDate?: Date } | null {
	const startDay = dayOfStoredDate(task.startDate);
	const dueDay = dayOfStoredDate(task.dueDate);
	if (startDay === null && dueDay === null) {
		return null;
	}
	const shape = {
		isDueOnly: startDay === null,
		isStartOnly: dueDay === null,
		hasInvalidRange: startDay !== null && dueDay !== null && dueDay < startDay
	};
	const next = draggedDatesOf(shape, { startDay, dueDay }, drag, deltaDays);
	if (!next) {
		return null;
	}
	return {
		...(next.startDay === undefined ? {} : { startDate: dateOfDayNumber(next.startDay) }),
		...(next.dueDay === undefined ? {} : { dueDate: dateOfDayNumber(next.dueDay) })
	};
}

/**
 * Where a bar shows while it is dragged: the days its dates would cover after `preview` (the whole move or one end),
 * as offsets inside the days drawn (the full dates are what is saved; the preview never leaves the calendar). Without
 * a preview, or one that changes nothing, where the bar is.
 */
export function previewDaysOf(
	bar: Pick<TeamTasksTimelineBar, 'startDay' | 'endDay' | 'isDueOnly' | 'isStartOnly' | 'hasInvalidRange'>,
	dates: { startDay: number | null; dueDay: number | null },
	preview: { drag: TeamTasksTimelineDrag; delta: number } | null,
	firstDay: number,
	dayCount: number
): { startDay: number; endDay: number } {
	const next = preview ? draggedDatesOf(bar, dates, preview.drag, preview.delta) : null;
	if (!next) {
		return { startDay: bar.startDay, endDay: bar.endDay };
	}
	const start = (next.startDay ?? dates.startDay ?? next.dueDay ?? dates.dueDay ?? 0) - firstDay;
	const end = (next.dueDay ?? dates.dueDay ?? next.startDay ?? dates.startDay ?? 0) - firstDay;
	const last = dayCount - 1;
	const clamp = (day: number) => Math.min(Math.max(day, 0), last);
	return { startDay: clamp(start), endDay: clamp(bar.hasInvalidRange ? start : Math.max(start, end)) };
}

/** Whether a bar's ends drag on their own: a range of several days (a one-day or single-date bar moves as a whole). */
export function hasEndHandlesOf(
	bar: Pick<TeamTasksTimelineBar, 'isDueOnly' | 'isStartOnly' | 'hasInvalidRange'>,
	dates: { startDay: number | null; dueDay: number | null }
): boolean {
	const isRange = !bar.isDueOnly && !bar.isStartOnly && !bar.hasInvalidRange;
	return isRange && dates.startDay !== null && dates.dueDay !== null && dates.dueDay > dates.startDay;
}
