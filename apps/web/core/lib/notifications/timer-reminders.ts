import { claimForThisTab } from '@/core/lib/realtime/tab-claim';
import type {
	INotificationPreferences,
	INotificationQuietHours
} from '@/core/types/interfaces/common/employee-notification';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/**
 * Reminders about a timer left running (#5022, time tracking): one when it has run for the employee's threshold, one
 * more at twice that (probably forgotten), never a third. The threshold is a notification preference, so it follows
 * the employee across devices.
 */

/** The threshold when the employee chose none: a working day. */
export const DEFAULT_TIMER_REMINDER_HOURS = 8;

/** The thresholds the settings offer. */
export const TIMER_REMINDER_HOUR_CHOICES: readonly number[] = [2, 4, 6, 8, 10, 12];

/** 1: the timer reached the threshold; 2: twice the threshold, probably forgotten. */
export type TimerReminderLevel = 1 | 2;

/** One run of the timer: what its reminders are kept for. */
export interface TimerRun {
	/** The run's time log, else its start: the same in every tab. */
	key: string;
	startedAt: number;
}

const HOUR_MS = 60 * 60 * 1000;

/** The employee's threshold in hours, or null when the reminders are off (`timerReminderHours: null` or 0). */
export function timerReminderHoursOf(preferences: INotificationPreferences | null | undefined): number | null {
	const hours = preferences?.timerReminderHours;
	if (hours === null || hours === 0) {
		return null;
	}
	return typeof hours === 'number' && Number.isFinite(hours) && hours > 0 && hours <= 24
		? hours
		: DEFAULT_TIMER_REMINDER_HOURS;
}

/** The run of a running timer, or null when it is stopped or its start is unknown. */
export function timerRunOf(status: ITimerStatus | null | undefined): TimerRun | null {
	const startedAt = status?.running ? Date.parse(String(status.lastLog?.startedAt ?? '')) : Number.NaN;
	if (Number.isNaN(startedAt)) {
		return null;
	}
	const logId = status?.lastLog?.id;
	return { key: logId ? String(logId) : new Date(startedAt).toISOString(), startedAt };
}

/** The reminder a run has reached after `elapsedMs`: 0 before the threshold. */
export function timerReminderLevelAt(elapsedMs: number, hours: number): 0 | TimerReminderLevel {
	if (elapsedMs >= 2 * hours * HOUR_MS) {
		return 2;
	}
	return elapsedMs >= hours * HOUR_MS ? 1 : 0;
}

/** When the run's next reminder is due, after the ones already shown; null once both were. */
export function nextTimerReminderAt(run: TimerRun, hours: number, shownLevel: number): number | null {
	if (shownLevel >= 2) {
		return null;
	}
	return run.startedAt + (shownLevel + 1) * hours * HOUR_MS;
}

/** The minutes since midnight of `date` in `timeZone` (the browser's when unset). */
function minutesOfDay(date: Date, timeZone?: string): number {
	const parts = new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
		...(timeZone ? { timeZone } : {})
	}).formatToParts(date);
	const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
	return value('hour') * 60 + value('minute');
}

function minutesOf(timeOfDay: string): number {
	const [hours, minutes] = timeOfDay.split(':').map(Number);
	return hours * 60 + minutes;
}

/** Whether `date` falls in the quiet hours; a window that ends before it starts spans midnight. */
export function isWithinQuietHours(date: Date, window: INotificationQuietHours | null): boolean {
	if (!window) {
		return false;
	}
	let now: number;
	try {
		now = minutesOfDay(date, window.timeZone);
	} catch {
		// An unknown time zone: the browser's own
		now = minutesOfDay(date);
	}
	const start = minutesOf(window.start);
	const end = minutesOf(window.end);
	if (start === end) {
		return false;
	}
	return start < end ? now >= start && now < end : now >= start || now < end;
}

/** Where the reminders shown for the current run are kept, for every tab and reload of this browser. */
const TIMER_REMINDER_KEY = 'ever-teams:timer-reminder';

/** The last reminder shown for the run, 0 when none was. */
export function shownTimerReminderLevel(runKey: string): number {
	try {
		const stored = JSON.parse(window.localStorage.getItem(TIMER_REMINDER_KEY) ?? 'null') as {
			run?: unknown;
			level?: unknown;
		} | null;
		return stored?.run === runKey && typeof stored.level === 'number' ? stored.level : 0;
	} catch {
		return 0;
	}
}

/** Notes the reminder shown for the run, never lower than one noted before it; only the current run is kept. */
export function recordTimerReminder(runKey: string, level: TimerReminderLevel): void {
	if (shownTimerReminderLevel(runKey) >= level) {
		return;
	}
	try {
		window.localStorage.setItem(TIMER_REMINDER_KEY, JSON.stringify({ run: runKey, level }));
	} catch {
		// No storage (a private window): the tab still shows each reminder once while it stays open
	}
}

/**
 * How long a tab out of sight waits before claiming a reminder, so the tab the employee looks at shows it (the same
 * wait as the inbox's chime, INBOX_ALERT_HIDDEN_YIELD_MS).
 */
export const TIMER_REMINDER_HIDDEN_YIELD_MS = 400;

/**
 * Claims the reminder of the run's level for this tab: true for the one tab of the browser that shows it, false when
 * it was shown already, in this tab, another one, or before a reload. Tabs reaching it together are settled by the
 * claim the tabs share (tab-claim.ts: one tab takes a key, a visible tab before a hidden one); the run's record then
 * keeps it shown for good, after that claim has expired.
 *
 * @param isVisible Whether the employee sees this tab.
 */
export async function claimTimerReminder(
	runKey: string,
	level: TimerReminderLevel,
	isVisible: boolean
): Promise<boolean> {
	if (shownTimerReminderLevel(runKey) >= level) {
		return false;
	}
	const isClaimed = await claimForThisTab(`timer-reminder-${runKey}-${level}`, {
		yieldMs: isVisible ? 0 : TIMER_REMINDER_HIDDEN_YIELD_MS
	});
	// A later reminder of the run was given while this claim waited (a tab whose threshold is shorter): this one is
	// out of date, and noting it would bring the run back to a lower reminder
	if (!isClaimed || shownTimerReminderLevel(runKey) >= level) {
		return false;
	}
	recordTimerReminder(runKey, level);
	return true;
}
