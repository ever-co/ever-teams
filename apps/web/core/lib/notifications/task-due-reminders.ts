import type { INotificationPreferences } from '@/core/types/interfaces/common/employee-notification';

/**
 * The reminders the platform sends the assignees of a task before its due date (#5022), as Gauzy files them
 * (`task-due-reminder.rules.ts` there): one per task and due date, a number of hours before it is due.
 */

/** The threshold when the person chose none, as Gauzy reads it: a day. */
export const DEFAULT_TASK_DUE_REMINDER_HOURS = 24;

/** The longest threshold Gauzy reads as one: a week. */
const MAX_TASK_DUE_REMINDER_HOURS = 7 * 24;

/** The thresholds the settings offer, in hours. */
export const TASK_DUE_REMINDER_HOUR_CHOICES: readonly number[] = [1, 4, 24, 48, 72, 168];

/** The person's threshold in hours, as Gauzy reads it, or null when they turned the reminders off. */
export function taskDueReminderHoursOf(preferences: INotificationPreferences | null | undefined): number | null {
	const hours = preferences?.taskDueReminderHours;
	if (hours === null || hours === 0) {
		return null;
	}
	const named = typeof hours === 'number' && Number.isFinite(hours) ? Number(hours.toFixed(2)) : Number.NaN;
	return named > 0 && named <= MAX_TASK_DUE_REMINDER_HOURS ? named : DEFAULT_TASK_DUE_REMINDER_HOURS;
}

/** When a reminded task is due, read off the message Gauzy files with the reminder. */
export type TaskDueNotice =
	/** A due date that names a day: due once that day is over (`YYYY-MM-DD`). */
	| { kind: 'day'; day: string }
	/** A due date that names a moment, in the zone Gauzy told it in. */
	| { kind: 'moment'; at: Date; timeZone: string };

const DAY_MESSAGE = /^Due by the end of (\d{4}-\d{2}-\d{2})\.$/;
const MOMENT_MESSAGE = /^Due at (\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}) \(([^)]+)\)\.$/;

/**
 * When the task of a due reminder is due, from Gauzy's English message (`Due by the end of 2026-11-20.`, or
 * `Due at 2026-11-19 17:00 (Europe/Paris).`), so the reader sees it in their language; null for any other message.
 * The messages are a contract with Gauzy's `taskDueReminderNotice`.
 */
export function taskDueNoticeOf(message: string | null | undefined): TaskDueNotice | null {
	const text = (message ?? '').trim();
	const day = DAY_MESSAGE.exec(text);
	if (day) {
		return { kind: 'day', day: day[1] };
	}
	const moment = MOMENT_MESSAGE.exec(text);
	if (!moment) {
		return null;
	}
	const [, date, hours, minutes, timeZone] = moment;
	const at = wallClockIn(date, Number(hours), Number(minutes), timeZone);
	return at ? { kind: 'moment', at, timeZone } : null;
}

/** The instant a wall-clock time names in a zone, or null for a zone the browser does not know. */
function wallClockIn(date: string, hours: number, minutes: number, timeZone: string): Date | null {
	const [year, month, day] = date.split('-').map(Number);
	const asUtc = Date.UTC(year, month - 1, day, hours, minutes);
	try {
		// The zone's offset at that moment, read back from how the zone writes it, applied once more for a DST edge
		let instant = asUtc;
		for (let pass = 0; pass < 2; pass++) {
			instant = asUtc - offsetOf(instant, timeZone);
		}
		return new Date(instant);
	} catch {
		return null;
	}
}

function offsetOf(instant: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric'
	}).formatToParts(new Date(instant));
	const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
	const wall = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'));
	return wall - Math.floor(instant / 60000) * 60000;
}
