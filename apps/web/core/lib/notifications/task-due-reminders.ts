import type { INotificationPreferences } from '@/core/types/interfaces/common/employee-notification';

/**
 * The reminders the platform sends the assignees of a task before its due date (#5022), as Gauzy files them
 * (`task-due-reminder.rules.ts` there): one per task and due date, a number of hours before it is due.
 */

/** The threshold when the person chose none, as Gauzy reads it: a day. */
export const DEFAULT_TASK_DUE_REMINDER_HOURS = 24;

const DAY_MS = 24 * 60 * 60 * 1000;

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
type TaskDueNotice =
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
	// A wall-clock time the zone shows twice (clocks go back, by an hour or by less) or never names no single moment:
	// the message is kept as it is
	const at = onlyMomentOf(date, Number(hours), Number(minutes), timeZone);
	return at ? { kind: 'moment', at, timeZone } : null;
}

/**
 * The one instant a wall-clock time names in a zone: each offset the zone has around that day gives a candidate, kept
 * when the zone shows that wall-clock time then. Null when two are kept (the time repeats), none is (it is skipped), or
 * the browser does not know the zone.
 */
function onlyMomentOf(date: string, hours: number, minutes: number, timeZone: string): Date | null {
	const [year, month, day] = date.split('-').map(Number);
	const asUtc = Date.UTC(year, month - 1, day, hours, minutes);
	try {
		const offsets = new Set([-DAY_MS, 0, DAY_MS].map((shift) => offsetOf(asUtc + shift, timeZone)));
		const moments = [...new Set([...offsets].map((offset) => asUtc - offset))].filter(
			(instant) => instant + offsetOf(instant, timeZone) === asUtc
		);
		return moments.length === 1 ? new Date(moments[0]) : null;
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
