import type { TTask } from '@/core/types/schemas/task/task.schema';
import { dateOnlyOfDayNumber, dayOfStoredDate } from './date-only';
import { foldIcsLine, icsDateOf, icsTextOf } from './ics';

// cspell:ignore CALSCALE DTEND DTSTAMP DTSTART PRODID VCALENDAR VEVENT

/** The file a view's due dates are saved as. */
export const TEAM_TASKS_ICS_FILE_NAME = 'ever-teams-due-dates.ics';

/** `toISOString` writes a year outside these as a signed, six-digit one, which no calendar reads. */
const FIRST_SAFE_YEAR = 1000;
const LAST_SAFE_YEAR = 9998;

/** A day as an iCalendar DATE value: `20261112`. */
function icsDayOf(day: Date): string {
	return day.toISOString().slice(0, 10).replaceAll('-', '');
}

interface DueDay {
	start: string;
	/** An all-day event ends the day after the one it fills, in iCalendar. */
	end: string;
}

function dueDayOf(task: TTask): DueDay | null {
	const dayNumber = dayOfStoredDate(task.dueDate);
	if (dayNumber === null) {
		return null;
	}
	const start = dateOnlyOfDayNumber(dayNumber);
	const year = start.getUTCFullYear();
	if (year < FIRST_SAFE_YEAR || year > LAST_SAFE_YEAR) {
		return null;
	}
	return { start: icsDayOf(start), end: icsDayOf(dateOnlyOfDayNumber(dayNumber + 1)) };
}

/** The id comes from Gauzy; the UID keeps its letters, digits and dashes only. */
function uidOf(task: TTask): string {
	return `task-${task.id.replace(/[^A-Za-z0-9-]/g, '')}@ever-teams`;
}

/** Whether a view has a task whose due date the file can hold: the export is offered only then. */
export function hasIcsDueDate(tasks: readonly TTask[]): boolean {
	return tasks.some((task) => dueDayOf(task) !== null);
}

/**
 * A calendar file (iCalendar) of the tasks a view lists: one all-day event on the day each task is due, to follow the
 * due dates in one's own calendar app. A task with no due date has no day and is left out, and a task that a view
 * lists twice is written once (by its UID, which a calendar app reads as the event's identity, so no two events share
 * one). Null when no task has a due date, so the caller offers no empty file.
 */
export function teamTasksIcsOf(tasks: readonly TTask[], now: Date = new Date()): string | null {
	const written = new Set<string>();
	const events: string[] = [];
	for (const task of tasks) {
		const day = dueDayOf(task);
		const uid = uidOf(task);
		if (!day || written.has(uid)) {
			continue;
		}
		written.add(uid);
		events.push(
			'BEGIN:VEVENT',
			`UID:${uid}`,
			`DTSTAMP:${icsDateOf(now)}`,
			`DTSTART;VALUE=DATE:${day.start}`,
			`DTEND;VALUE=DATE:${day.end}`,
			`SUMMARY:${icsTextOf(task.title)}`,
			'TRANSP:TRANSPARENT',
			'END:VEVENT'
		);
	}
	if (events.length === 0) {
		return null;
	}
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Ever Teams//Tasks//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		...events,
		'END:VCALENDAR'
	];
	return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
