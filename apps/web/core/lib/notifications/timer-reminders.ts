import { emailModeOf, pushOnFor, quietHoursOf } from '@/core/lib/notifications/notification-preferences';
import { claimForThisTab, releaseTabClaim } from '@/core/lib/realtime/tab-claim';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import {
	EEmployeeNotificationType,
	type IEmployeeNotification,
	type INotificationPreferences,
	type INotificationQuietHours
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
	// To the hundredth, as Gauzy's title names it (`1.23 hours`): one the title cannot name (0.004) is the default there
	const named = typeof hours === 'number' && Number.isFinite(hours) ? Number(hours.toFixed(2)) : Number.NaN;
	return named > 0 && named <= 24 ? named : DEFAULT_TIMER_REMINDER_HOURS;
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

/** When the run's reminder of a level comes due. */
export function timerReminderDueAt(run: TimerRun, hours: number, level: TimerReminderLevel): number {
	return run.startedAt + level * hours * HOUR_MS;
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

/** Where the reminders given for the current run are kept, for every tab and reload of this browser. */
const TIMER_REMINDER_KEY = 'ever-teams:timer-reminder';

/**
 * The run's record in this browser: `level`, the last reminder given (shown here, or left to the platform's email or
 * push), and `shown`, the last one this browser put in front of the person (a toast in sight, or a system
 * notification). A record written before `shown` existed shows nothing.
 */
function storedTimerReminder(runKey: string): { level: number; shown: number } {
	try {
		const stored = JSON.parse(window.localStorage.getItem(TIMER_REMINDER_KEY) ?? 'null') as {
			run?: unknown;
			level?: unknown;
			shown?: unknown;
		} | null;
		if (stored?.run !== runKey) {
			return { level: 0, shown: 0 };
		}
		return {
			level: typeof stored.level === 'number' ? stored.level : 0,
			shown: typeof stored.shown === 'number' ? stored.shown : 0
		};
	} catch {
		return { level: 0, shown: 0 };
	}
}

/** The last reminder given for the run, shown here or left to the platform, 0 when none was. */
export function givenTimerReminderLevel(runKey: string): number {
	return storedTimerReminder(runKey).level;
}

/**
 * The last reminder of the run this browser showed the person, 0 when none: only such a reminder's copy on the platform
 * may be marked read.
 */
export function shownTimerReminderLevel(runKey: string): number {
	return storedTimerReminder(runKey).shown;
}

/**
 * Notes a reminder of the run as given (shown, or left to the platform), and as shown when the person saw it, never
 * lower than one noted before it; only the current run is kept.
 */
export function recordTimerReminder(
	runKey: string,
	level: TimerReminderLevel,
	{ shown = false }: { shown?: boolean } = {}
): void {
	const before = storedTimerReminder(runKey);
	const next = {
		run: runKey,
		level: Math.max(before.level, level),
		shown: shown ? Math.max(before.shown, level) : before.shown
	};
	if (next.level === before.level && next.shown === before.shown) {
		return;
	}
	try {
		window.localStorage.setItem(TIMER_REMINDER_KEY, JSON.stringify(next));
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
 * How soon a tab asks again for a reminder another tab claimed but has not given yet: that tab may still give it, or
 * give the claim back. Asking stops once a tab gives it, or when the claim expires (TAB_CLAIM_TTL_MS) and this tab
 * takes it.
 */
export const TIMER_REMINDER_CLAIM_RETRY_MS = 30_000;

/**
 * Claims the reminder of the run's level for this tab: true for the one tab of the browser that shows it, false when
 * it was given already, in this tab, another one, or before a reload. Tabs reaching it together are settled by the
 * claim the tabs share (tab-claim.ts: one tab takes a key, a visible tab before a hidden one); the run's record then
 * keeps it shown for good, after that claim has expired.
 *
 * @param isVisible Whether the employee sees this tab.
 * @param isCalledOff Whether the reminder was called off while the claim waited (its run ended, or a threshold is being
 * saved): the claim is then given back, and nothing is noted, so the next check (here or in another tab) decides.
 */
export async function claimTimerReminder(
	runKey: string,
	level: TimerReminderLevel,
	isVisible: boolean,
	isCalledOff: () => boolean = () => false
): Promise<boolean> {
	if (givenTimerReminderLevel(runKey) >= level) {
		return false;
	}
	const key = `timer-reminder-${runKey}-${level}`;
	const isClaimed = await claimForThisTab(key, { yieldMs: isVisible ? 0 : TIMER_REMINDER_HIDDEN_YIELD_MS });
	if (!isClaimed) {
		return false;
	}
	if (isCalledOff()) {
		releaseTabClaim(key);
		return false;
	}
	// A later reminder of the run was given while this claim waited (a tab whose threshold is shorter): this one is
	// out of date, and noting it would bring the run back to a lower reminder
	if (givenTimerReminderLevel(runKey) >= level) {
		return false;
	}
	recordTimerReminder(runKey, level);
	return true;
}

/** A reminder the platform filed about a run (`TimerReminder`), as the bell and the inbox show it. */
export interface TimerReminderNotice {
	/** 1 at the threshold, 2 at twice it; 1 for a title this app does not know. */
	level: TimerReminderLevel;
	/** The hours the run had reached when it was filed, or null when the title names none. */
	hours: number | null;
	/** The run's time log, the record the reminder is about. */
	timeLogId: string | null;
}

/**
 * The openings of the platform's English titles of its timer reminders (Gauzy's `timerReminderNotice`), read the way
 * the inbox reads the other kinds' titles: `Your timer has been running for 8 hours` and `Your timer is still running
 * after 16 hours`, followed by ` on "<task>"` when the run has a task.
 */
const LONG_REMINDER_TITLE = /^Your timer has been running for (\d+(?:\.\d+)?) hours?\b/;
const FORGOTTEN_REMINDER_TITLE = /^Your timer is still running after (\d+(?:\.\d+)?) hours?\b/;

/** The timer reminder a notification (or the inbox item filed for it) is, or null for any other kind. */
export function timerReminderNoticeOf(notification: {
	type?: string | null;
	title?: string | null;
	entity?: string | null;
	entityId?: string | null;
}): TimerReminderNotice | null {
	if (notification.type !== EEmployeeNotificationType.TimerReminder) {
		return null;
	}
	const title = (notification.title ?? '').trim();
	const long = LONG_REMINDER_TITLE.exec(title);
	const forgotten = long ? null : FORGOTTEN_REMINDER_TITLE.exec(title);
	const hours = Number((long ?? forgotten)?.[1]);
	return {
		level: forgotten ? 2 : 1,
		hours: Number.isFinite(hours) && hours > 0 ? hours : null,
		timeLogId:
			notification.entity === EBaseEntityEnum.TimeLog && notification.entityId
				? String(notification.entityId)
				: null
	};
}

/**
 * How long the platform holds the email and the push of a timer reminder, for the tab that showed it to mark it read
 * (Gauzy's `INBOX_DELIVERY_TIMER_REMINDER_GRACE_MS`). The platform files every reminder unread: a run's heartbeat does
 * not tell it whether an Ever Teams tab is open.
 */
export const TIMER_REMINDER_DELIVERY_GRACE_MS = 3 * 60 * 1000;

/**
 * The time a tab leaves itself for its mark to reach the platform before the platform's copy goes out: a copy that goes
 * out sooner is taken as gone. The browser's clock is compared with the platform's (`serverClockOffset`); where the app
 * has not read the platform's clock yet, the margin is wider, as the two may disagree.
 */
export const TIMER_REMINDER_MARK_MARGIN_MS = 60 * 1000;
export const TIMER_REMINDER_MARK_MARGIN_UNSYNCED_MS = 2 * 60 * 1000;

/** How often a tab that showed a reminder asks for the platform's copy of it, to mark it read, and for how long. */
export const TIMER_REMINDER_MARK_READ_RETRY_MS = 30_000;
export const TIMER_REMINDER_MARK_READ_WINDOW_MS = 10 * 60 * 1000;

/** A timer reminder as the platform answers it: what it says, whether it was read, and when it was filed. */
type PlatformTimerReminder = Parameters<typeof timerReminderNoticeOf>[0] &
	Pick<IEmployeeNotification, 'isRead'> & { createdAt?: string | null };

/** What a tab knows when it decides whether the platform already reminded the person. */
export interface TimerReminderDeliveryContext {
	/** Now, on the platform's clock where the app knows it, else on the browser's. */
	serverNow: number;
	/** TIMER_REMINDER_MARK_MARGIN_MS, or the wider margin while the platform's clock is not known. */
	markMarginMs: number;
	/** The person's notification preferences, which say whether and when the platform's copy goes out. */
	preferences: INotificationPreferences | null | undefined;
}

/** When the quiet hours that `at` falls in end (to the minute, in the window's time zone, else the browser's). */
export function quietHoursEndAfter(at: number, window: INotificationQuietHours): number {
	let minutes: number;
	try {
		minutes = minutesOfDay(new Date(at), window.timeZone);
	} catch {
		minutes = minutesOfDay(new Date(at));
	}
	const untilEnd = (minutesOf(window.end) - minutes + 24 * 60) % (24 * 60);
	return at + untilEnd * 60 * 1000;
}

/**
 * When the platform's unread copy of a reminder reaches the person: by email at once or by push, once the platform's
 * hold is over, or at the end of the quiet hours that hold ends in. Null when it reaches them neither way (the email in
 * the digest or off, and push off for the kind): only the inbox has it. A copy whose filing time is unknown is taken as
 * gone.
 */
export function timerReminderGoesOutAt(
	copy: Pick<PlatformTimerReminder, 'createdAt'>,
	preferences: INotificationPreferences | null | undefined
): number | null {
	const isEmailedAtOnce = emailModeOf(preferences, EEmployeeNotificationType.TimerReminder) === 'immediate';
	if (!isEmailedAtOnce && !pushOnFor(preferences, EEmployeeNotificationType.TimerReminder)) {
		return null;
	}
	const filedAt = Date.parse(String(copy.createdAt ?? ''));
	if (Number.isNaN(filedAt)) {
		return Number.NEGATIVE_INFINITY;
	}
	const due = filedAt + TIMER_REMINDER_DELIVERY_GRACE_MS;
	const quiet = quietHoursOf(preferences);
	return quiet && isWithinQuietHours(new Date(due), quiet) ? quietHoursEndAfter(due, quiet) : due;
}

/**
 * Whether the person already got this reminder from the platform, so the tab does not repeat it: the inbox has the
 * run's reminder at this level or a later one, and it is read (another tab or device showed it, or the person read it
 * in the app), or it is unread and reaches the person by email at once or by push before the tab's mark could stop it.
 * An unread copy the platform still holds (filed moments ago, or held through the quiet hours), and one that reaches
 * the person nowhere but in the inbox, is not got: the tab shows the reminder and marks the copy read.
 *
 * @param reminders The person's timer reminders about the run, as the platform answers them.
 */
export function wasRemindedByServer(
	reminders: ReadonlyArray<PlatformTimerReminder>,
	run: TimerRun,
	level: TimerReminderLevel,
	context: TimerReminderDeliveryContext
): boolean {
	const got = reminders.filter((reminder) => {
		const notice = timerReminderNoticeOf(reminder);
		return notice !== null && notice.timeLogId === run.key && notice.level >= level;
	});
	if (got.some((reminder) => reminder.isRead === true)) {
		return true;
	}
	const deadline = context.serverNow + context.markMarginMs;
	return got.some((reminder) => {
		const goesOutAt = timerReminderGoesOutAt(reminder, context.preferences);
		return goesOutAt !== null && goesOutAt <= deadline;
	});
}

/**
 * The platform's copy of a reminder this tab showed, to mark read so that its email and push do not follow: the run's
 * reminder of that level while it is unread, `'read'` once it is read, null while the platform has filed none (it
 * files one at its next sweep, a minute or so after the reminder came due).
 */
export function timerReminderToMarkRead(
	reminders: ReadonlyArray<PlatformTimerReminder & Pick<IEmployeeNotification, 'id'>>,
	runKey: string,
	level: TimerReminderLevel
): { id: string } | 'read' | null {
	const copies = reminders.filter((reminder) => {
		const notice = timerReminderNoticeOf(reminder);
		return notice !== null && notice.timeLogId === runKey && notice.level === level;
	});
	const unread = copies.find((reminder) => reminder.isRead !== true);
	if (unread) {
		return { id: String(unread.id) };
	}
	return copies.length > 0 ? 'read' : null;
}
