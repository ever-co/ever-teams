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

/** Bar height in percent of the chart; a week with any task keeps a visible sliver, an empty week none. */
export function activityBarPercentOf(count: number, peak: number): number {
	if (count <= 0 || peak <= 0) {
		return 0;
	}
	const percent = (count / peak) * 100;
	return Math.max(4, Math.min(100, percent));
}
