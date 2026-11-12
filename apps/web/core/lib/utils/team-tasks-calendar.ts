import { isInAnchorMonth, isWeekendDay, visibleRangeOf } from './calendar-view';
import { daysOfPeriod, type WeekStart } from './dashboard-period';
import { dayNumberOf, dayOfStoredDate } from './team-tasks-timeline';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const DAYS_IN_A_WEEK = 7;

export interface TeamTasksCalendarDay {
	/** The day as a whole number of days, the unit a stored due date is matched on. */
	dayNumber: number;
	date: Date;
	isOutsideMonth: boolean;
	isWeekend: boolean;
	isToday: boolean;
	isPast: boolean;
	/** The tasks due on this day, in the view's order. */
	tasks: TTask[];
}

export interface TeamTasksCalendarMonth {
	/** Six whole weeks around the month, as the Calendar page draws them. */
	weeks: TeamTasksCalendarDay[][];
	/** The days of the month itself that have a task due, for the phone's list. */
	busyDays: TeamTasksCalendarDay[];
	/** The tasks with no due date, in the view's order: they sit on no day. */
	undated: TTask[];
	/** How many tasks are due in the month shown, the days of the neighbouring months aside. */
	dueInMonthCount: number;
}

interface TasksByDueDay {
	byDay: Map<number, TTask[]>;
	undated: TTask[];
}

function tasksByDueDayOf(tasks: readonly TTask[]): TasksByDueDay {
	const byDay = new Map<number, TTask[]>();
	const undated: TTask[] = [];
	for (const task of tasks) {
		const dueDay = dayOfStoredDate(task.dueDate);
		if (dueDay === null) {
			undated.push(task);
			continue;
		}
		const sameDay = byDay.get(dueDay) ?? [];
		sameDay.push(task);
		byDay.set(dueDay, sameDay);
	}
	return { byDay, undated };
}

function weeksOf(days: TeamTasksCalendarDay[]) {
	const weeks: TeamTasksCalendarDay[][] = [];
	for (let index = 0; index < days.length; index += DAYS_IN_A_WEEK) {
		const week = days.slice(index, index + DAYS_IN_A_WEEK);
		weeks.push(week);
	}
	return weeks;
}

function taskCountOf(days: TeamTasksCalendarDay[]) {
	let count = 0;
	for (const day of days) {
		count += day.tasks.length;
	}
	return count;
}

/**
 * The month a view's tasks are read on: each task on the day it is due, the tasks without a due date apart. A due
 * date names a day (the timeline's rule, `dayOfStoredDate`), so a task shows on the same day in every time zone.
 */
export function teamTasksCalendarMonthOf(
	tasks: readonly TTask[],
	anchor: Date,
	weekStartsOn: WeekStart,
	today: Date
): TeamTasksCalendarMonth {
	const { byDay, undated } = tasksByDueDayOf(tasks);
	const range = visibleRangeOf('month', anchor, weekStartsOn);
	const todayNumber = dayNumberOf(today);
	const days = daysOfPeriod(range).map((date): TeamTasksCalendarDay => {
		const dayNumber = dayNumberOf(date);
		return {
			dayNumber,
			date,
			isOutsideMonth: !isInAnchorMonth(date, anchor),
			isWeekend: isWeekendDay(date),
			isToday: dayNumber === todayNumber,
			isPast: dayNumber < todayNumber,
			tasks: byDay.get(dayNumber) ?? []
		};
	});
	const monthDays = days.filter((day) => !day.isOutsideMonth);
	const busyDays = monthDays.filter((day) => day.tasks.length > 0);
	return {
		weeks: weeksOf(days),
		busyDays,
		undated,
		dueInMonthCount: taskCountOf(busyDays)
	};
}
