import { differenceInCalendarWeeks, startOfWeek, subWeeks } from 'date-fns';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import { realDateOf, statusCategoryOf } from '@/core/lib/utils/project-list';
import type { WeekStart } from '@/core/lib/utils/dashboard-period';

/** Weeks shown by default: long enough to see a trend, short enough to stay readable in a narrow side panel. */
export const DEFAULT_ACTIVITY_WEEKS = 8;
export const MIN_ACTIVITY_WEEKS = 1;
export const MAX_ACTIVITY_WEEKS = 26;

const WEEK_STARTS_ON_MONDAY: WeekStart = 1;

export interface WeeklyActivity {
	/** The first day, 00:00 local time, of the week the counts belong to. */
	weekStart: Date;
	created: number;
	completed: number;
}

export interface ProjectActivity {
	weeks: WeeklyActivity[];
	created: number;
	completed: number;
	/** The tallest bar, so a chart can scale every week against the same value; never below 1. */
	peak: number;
	/** Done tasks Gauzy holds no resolution date for: they are not placed in any week. */
	undatedDone: number;
}

/** The number of weeks to show: the default when none or no finite number is asked for, else bounded and whole. */
export function activityWeeksCountOf(requested: number | undefined): number {
	if (requested === undefined || !Number.isFinite(requested)) {
		return DEFAULT_ACTIVITY_WEEKS;
	}
	const whole = Math.trunc(requested);
	return Math.min(MAX_ACTIVITY_WEEKS, Math.max(MIN_ACTIVITY_WEEKS, whole));
}

/** `count` empty weeks, oldest first, ending with the week of `now`. */
function emptyWeeksOf(now: Date, count: number, weekStartsOn: WeekStart): WeeklyActivity[] {
	const currentWeekStart = startOfWeek(now, { weekStartsOn });
	const weeks: WeeklyActivity[] = [];
	for (let back = count - 1; back >= 0; back -= 1) {
		weeks.push({ weekStart: subWeeks(currentWeekStart, back), created: 0, completed: 0 });
	}
	return weeks;
}

/**
 * The week of the window a date falls in, or null when it is before the window or after the current week. A date later
 * in the current week than `now` still counts: the chart keeps one `now` for the whole week, so a task created or
 * completed after the page was opened (or stamped by a server whose clock runs ahead) lands in this week's bars.
 */
function weekOf(
	weeks: ReadonlyArray<WeeklyActivity>,
	date: Date | null,
	weekStartsOn: WeekStart
): WeeklyActivity | null {
	if (!date) {
		return null;
	}
	const index = differenceInCalendarWeeks(date, weeks[0].weekStart, { weekStartsOn });
	return weeks[index] ?? null;
}

/**
 * Tasks created and tasks completed per week over the last `weeksCount` weeks, the current one included. A task counts
 * as completed from its status, as everywhere else in the project, and is placed in the week it was resolved: a task
 * that was reopened has a resolution date but is not done, so it is not counted.
 */
export function projectActivityOf(
	tasks: ReadonlyArray<TTask>,
	statuses: TTaskStatus[],
	now: Date,
	weeksCount?: number,
	weekStartsOn: WeekStart = WEEK_STARTS_ON_MONDAY
): ProjectActivity {
	const weeks = emptyWeeksOf(now, activityWeeksCountOf(weeksCount), weekStartsOn);
	let undatedDone = 0;
	for (const task of tasks) {
		const createdWeek = weekOf(weeks, realDateOf(task.createdAt), weekStartsOn);
		if (createdWeek) {
			createdWeek.created += 1;
		}
		if (statusCategoryOf(task.status, statuses) !== 'done') {
			continue;
		}
		const resolvedAt = realDateOf(task.resolvedAt);
		if (!resolvedAt) {
			undatedDone += 1;
			continue;
		}
		const resolvedWeek = weekOf(weeks, resolvedAt, weekStartsOn);
		if (resolvedWeek) {
			resolvedWeek.completed += 1;
		}
	}
	let created = 0;
	let completed = 0;
	let peak = 1;
	for (const week of weeks) {
		created += week.created;
		completed += week.completed;
		peak = Math.max(peak, week.created, week.completed);
	}
	return { weeks, created, completed, peak, undatedDone };
}

/** Fewer complete weeks than this is too little history to call a pace. */
export const MIN_FORECAST_WEEKS = 2;
/** A finish further away than this is shown as "more than", not as a date nobody can trust. */
export const MAX_FORECAST_WEEKS = 52;

export interface ProjectForecast {
	/** Tasks not yet done. */
	open: number;
	/** Tasks completed per week, over the complete weeks the project has existed in the window. */
	velocity: number;
	/** Whole weeks to finish the open tasks at that pace, never above `MAX_FORECAST_WEEKS`. */
	weeksLeft: number;
	/** True when the real estimate is above `MAX_FORECAST_WEEKS`. */
	isBeyondHorizon: boolean;
}

/**
 * How long the open tasks take at the pace of the recent weeks, or null when no honest estimate exists: nothing is open,
 * nothing was completed, or the project has fewer than `MIN_FORECAST_WEEKS` complete weeks in the window. The pace counts
 * complete weeks only (the running week would drag it down) and starts at the week of the project's first task (creation
 * or resolution date) when that falls inside the window, so a young project is not averaged against weeks before it
 * existed. If any task has no creation date the project's age is unknown and the whole window is used. Tasks done without a
 * resolution date are not counted: the pace errs on the slow side.
 */
export function projectForecastOf(
	tasks: ReadonlyArray<TTask>,
	statuses: TTaskStatus[],
	activity: ProjectActivity,
	weekStartsOn: WeekStart = WEEK_STARTS_ON_MONDAY
): ProjectForecast | null {
	const { weeks } = activity;
	if (weeks.length === 0) {
		return null;
	}
	let open = 0;
	let earliestTime = Number.POSITIVE_INFINITY;
	let hasUndatedTask = false;
	for (const task of tasks) {
		const isDone = statusCategoryOf(task.status, statuses) === 'done';
		if (!isDone) {
			open += 1;
		}
		const createdAt = realDateOf(task.createdAt);
		if (createdAt) {
			earliestTime = Math.min(earliestTime, createdAt.getTime());
		} else {
			hasUndatedTask = true;
		}
		// A task finished before its recorded creation still proves the project was running by then.
		const resolvedAt = isDone ? realDateOf(task.resolvedAt) : null;
		if (resolvedAt) {
			earliestTime = Math.min(earliestTime, resolvedAt.getTime());
		}
	}
	if (open === 0) {
		return null;
	}
	// A task with no creation date may be as old as the window: its history is kept, not cut at the dated tasks.
	const firstIndex =
		Number.isFinite(earliestTime) && !hasUndatedTask
			? Math.min(
					weeks.length - 1,
					Math.max(
						0,
						differenceInCalendarWeeks(new Date(earliestTime), weeks[0].weekStart, { weekStartsOn })
					)
				)
			: 0;
	const completeWeeks = weeks.slice(firstIndex, weeks.length - 1);
	if (completeWeeks.length < MIN_FORECAST_WEEKS) {
		return null;
	}
	const completed = completeWeeks.reduce((sum, week) => sum + week.completed, 0);
	if (completed === 0) {
		return null;
	}
	// Integer arithmetic keeps an exact division (6 open at 3 a week) from rounding up to an extra week.
	const rawWeeks = Math.ceil((open * completeWeeks.length) / completed);
	const pace = completed / completeWeeks.length;
	return {
		open,
		// One decimal reads well, but a pace under 0.05 (1 task in 25 weeks = 0.04) would show as 0 next to an estimate
		// that counts it: keep two significant digits there.
		velocity: pace < 0.05 ? Number(pace.toPrecision(2)) : Math.round(pace * 10) / 10,
		weeksLeft: Math.min(MAX_FORECAST_WEEKS, rawWeeks),
		isBeyondHorizon: rawWeeks > MAX_FORECAST_WEEKS
	};
}

/** Bar height in percent of the chart; a week with any task keeps a visible sliver, an empty week none. */
export function activityBarPercentOf(count: number, peak: number): number {
	if (count <= 0 || peak <= 0) {
		return 0;
	}
	const percent = (count / peak) * 100;
	return Math.max(4, Math.min(100, percent));
}
