/**
 * Pragmatic drag and drop passes plain records, so a private symbol tells the calendar's tasks and days from anything
 * else dragged over the page.
 */
const TASK_KEY = Symbol('team-tasks-calendar-task');
const DAY_KEY = Symbol('team-tasks-calendar-day');

type DragData = Record<string | symbol, unknown>;

/** A dragged task, with its days as day numbers (null: the task has no such date). */
type CalendarTaskData = { [TASK_KEY]: true; taskId: string; dueDay: number | null; startDay: number | null };

type CalendarDayData = { [DAY_KEY]: true; day: number };

export function calendarTaskData(taskId: string, dueDay: number | null, startDay: number | null): CalendarTaskData {
	return { [TASK_KEY]: true, taskId, dueDay, startDay };
}

export function calendarDayData(day: number): CalendarDayData {
	return { [DAY_KEY]: true, day };
}

export function isCalendarTaskData(data: DragData): data is CalendarTaskData {
	return data[TASK_KEY] === true;
}

function isCalendarDayData(data: DragData): data is CalendarDayData {
	return data[DAY_KEY] === true;
}

/**
 * Whether a dragged task can be dropped on a day: any day but the one it is due on. A task without a due date takes
 * no day before its start, which the due date picker refuses too (a task with one moves as a whole, start included).
 */
export function canDropOnDay(task: DragData, day: number) {
	if (!isCalendarTaskData(task)) {
		return false;
	}
	const isDueThatDay = task.dueDay === day;
	if (isDueThatDay) {
		return false;
	}
	const isUndated = task.dueDay === null;
	const startsLater = task.startDay !== null && day < task.startDay;
	const isBeforeItsStart = isUndated && startsLater;
	return !isBeforeItsStart;
}

/** The move a drop makes: the task and the day it now falls due on. Null when the drop changes nothing. */
export function calendarMoveOf(source: DragData, target: DragData): { taskId: string; day: number } | null {
	if (!isCalendarTaskData(source) || !isCalendarDayData(target)) {
		return null;
	}
	if (!canDropOnDay(source, target.day)) {
		return null;
	}
	return { taskId: source.taskId, day: target.day };
}
