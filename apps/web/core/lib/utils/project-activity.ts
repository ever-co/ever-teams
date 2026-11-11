import { differenceInCalendarWeeks, startOfWeek, subWeeks } from 'date-fns';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import { realDateOf, statusCategoryOf } from '@/core/lib/utils/project-list';

/** Weeks shown by default: long enough to see a trend, short enough to stay readable in a narrow side panel. */
export const DEFAULT_ACTIVITY_WEEKS = 8;
export const MIN_ACTIVITY_WEEKS = 1;
export const MAX_ACTIVITY_WEEKS = 26;

const WEEK_STARTS_ON_MONDAY = 1;

export interface WeeklyActivity {
	/** Monday, 00:00 local time, of the week the counts belong to. */
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

export function activityWeeksCountOf(requested: number | undefined): number {
	if (requested === undefined || !Number.isFinite(requested)) {
		return DEFAULT_ACTIVITY_WEEKS;
	}
	const whole = Math.trunc(requested);
	return Math.min(MAX_ACTIVITY_WEEKS, Math.max(MIN_ACTIVITY_WEEKS, whole));
}

function emptyWeeksOf(now: Date, count: number): WeeklyActivity[] {
	const currentWeekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON_MONDAY });
	const weeks: WeeklyActivity[] = [];
	for (let back = count - 1; back >= 0; back -= 1) {
		weeks.push({ weekStart: subWeeks(currentWeekStart, back), created: 0, completed: 0 });
	}
	return weeks;
}

/** The week of the window a date falls in, or null when it is before the window or after `now`. */
function weekOf(weeks: ReadonlyArray<WeeklyActivity>, date: Date | null, now: Date): WeeklyActivity | null {
	if (!date) {
		return null;
	}
	if (date.getTime() > now.getTime()) {
		return null;
	}
	const index = differenceInCalendarWeeks(date, weeks[0].weekStart, { weekStartsOn: WEEK_STARTS_ON_MONDAY });
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
	weeksCount?: number
): ProjectActivity {
	const weeks = emptyWeeksOf(now, activityWeeksCountOf(weeksCount));
	let undatedDone = 0;
	for (const task of tasks) {
		const createdWeek = weekOf(weeks, realDateOf(task.createdAt), now);
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
		const resolvedWeek = weekOf(weeks, resolvedAt, now);
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

/** Full weeks needed before a pace is shown: one week is noise, not a pace. */
export const MIN_PACE_WEEKS = 2;
/** A forecast further out than this is a guess, not a plan, so none is given. */
export const MAX_FORECAST_WEEKS = 52;

export interface ProjectPace {
	/** Tasks that are not done, whatever their dates. */
	open: number;
	/** Full weeks the pace was measured over. */
	weeksMeasured: number;
	/** Average tasks completed per full week, to one decimal; null when there is nothing to measure yet. */
	perWeek: number | null;
	/** Whole weeks the open tasks need at that pace; null without a pace, with nothing open, or past the maximum. */
	weeksToClear: number | null;
}

/**
 * How fast a project completes tasks, and what that means for the tasks still open. The pace is measured over the
 * full weeks of the activity window only (the current week is still running, so counting it would understate the
 * pace), starting at the first week with any activity so a young project is not diluted by weeks before it existed.
 */
export function projectPaceOf(
	tasks: ReadonlyArray<TTask>,
	statuses: TTaskStatus[],
	activity: ProjectActivity
): ProjectPace {
	let open = 0;
	for (const task of tasks) {
		if (statusCategoryOf(task.status, statuses) !== 'done') {
			open += 1;
		}
	}

	const fullWeeks = activity.weeks.slice(0, -1);
	const firstActive = fullWeeks.findIndex((week) => week.created > 0 || week.completed > 0);
	const measured = firstActive === -1 ? [] : fullWeeks.slice(firstActive);
	const completed = measured.reduce((sum, week) => sum + week.completed, 0);

	if (measured.length < MIN_PACE_WEEKS || completed === 0) {
		return { open, weeksMeasured: measured.length, perWeek: null, weeksToClear: null };
	}

	const rawPerWeek = completed / measured.length;
	const weeks = Math.ceil(open / rawPerWeek);
	const hasForecast = open > 0 && weeks <= MAX_FORECAST_WEEKS;
	return {
		open,
		weeksMeasured: measured.length,
		// Never shown as 0: at least one task was completed, so a slow pace reads as 0.1.
		perWeek: Math.max(0.1, Math.round(rawPerWeek * 10) / 10),
		weeksToClear: hasForecast ? weeks : null
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
