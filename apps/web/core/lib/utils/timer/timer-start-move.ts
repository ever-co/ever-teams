import { ETimeLogSource } from '@/core/types/generics/enums/timer';

/** The permission the timer's routes ask for. */
export const TIME_TRACKER_PERMISSION = 'TIME_TRACKER';

/** The permission Gauzy asks for any move of a running timer's start. */
export const MODIFY_TIME_PERMISSION = 'ALLOW_MODIFY_TIME';

/** The permission Gauzy asks for an earlier start, whose added minutes count as time added by hand. */
export const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';

/** The longest reason a time log keeps (its `reason` column is a 255-character string on MySQL). */
export const TIMER_START_REASON_MAX_LENGTH = 255;

/**
 * Whether the API behind the app can move a running timer's start (`PUT /timesheet/timer/started-at`), learnt from
 * one check: `checking` until it answers.
 */
export type TimerStartMoveSupport = 'checking' | 'supported' | 'unsupported';

/** What the running time's panel offers: the field, or the start alone with the reason it cannot change here. */
export type TimerStartMoveAccess =
	| { kind: 'edit'; earlierAllowed: boolean; reasonRequired: boolean }
	| { kind: 'view'; why: 'tracker' | 'not-allowed' | 'unsupported' | 'checking' };

/** The organization's rules on tracked time, as the organization record carries them. */
export interface TimePolicy {
	allowManualTime?: boolean | null;
	allowModifyTime?: boolean | null;
	requireReason?: boolean | null;
}

interface TimerStartMoveAccessInput {
	/** Where the running log was started. */
	source: ETimeLogSource | string | null | undefined;
	support: TimerStartMoveSupport;
	/** The permissions the session's role holds. */
	permissions: readonly string[];
	organization: TimePolicy | null | undefined;
}

/**
 * What the panel of the running time offers, following the rules the API applies to a move of the start: the desktop
 * app records its own time, a switch of the organization that is not on refuses (as the API reads it), the role needs
 * the permission to change tracked time, and an earlier start adds time by hand.
 */
export function timerStartMoveAccessOf(input: TimerStartMoveAccessInput): TimerStartMoveAccess {
	const isTrackerRun = input.source === ETimeLogSource.DESKTOP;
	if (isTrackerRun) {
		return { kind: 'view', why: 'tracker' };
	}
	if (input.support === 'unsupported') {
		return { kind: 'view', why: 'unsupported' };
	}
	if (input.support === 'checking') {
		return { kind: 'view', why: 'checking' };
	}

	const roleMayModifyTime = holdsTimerStartMovePermissions(input.permissions);
	const organizationMayModifyTime = input.organization?.allowModifyTime === true;
	const mayModifyTime = roleMayModifyTime && organizationMayModifyTime;
	if (!mayModifyTime) {
		return { kind: 'view', why: 'not-allowed' };
	}

	const roleMayAddTime = input.permissions.includes(MANUAL_TIME_PERMISSION);
	const organizationMayAddTime = input.organization?.allowManualTime === true;
	const earlierAllowed = roleMayAddTime && organizationMayAddTime;
	const reasonRequired = input.organization?.requireReason === true;
	return { kind: 'edit', earlierAllowed, reasonRequired };
}

/**
 * What one check of the route says about the API: an empty body is refused (400) by an API that has the route, and a
 * missing route answers 404. Any other answer leaves the field to the save, which then says what went wrong.
 */
export function timerStartMoveSupportOf(statusCode: number | undefined): TimerStartMoveSupport {
	const routeIsMissing = statusCode === 404;
	if (routeIsMissing) {
		return 'unsupported';
	}
	return 'supported';
}

/** The message of each refusal code the API answers a move of the running start with. */
const REFUSAL_KEYS: Readonly<Record<string, string>> = {
	TIMER_NOT_RUNNING: 'timer.startMove.NOT_RUNNING',
	TIMER_START_TRACKER_RUN: 'timer.startMove.TRACKER_RUN',
	TIMER_START_IN_FUTURE: 'timer.startMove.IN_FUTURE',
	TIMER_START_EDIT_NOT_ALLOWED: 'timer.startMove.EDIT_NOT_ALLOWED',
	TIMER_START_MANUAL_NOT_ALLOWED: 'timer.startMove.MANUAL_NOT_ALLOWED',
	TIMER_START_REASON_REQUIRED: 'timer.startMove.REASON_REQUIRED',
	TIMER_START_REASON_TOO_LONG: 'timer.startMove.REASON_TOO_LONG',
	TIMER_START_OVERLAP: 'timer.startMove.OVERLAP',
	TIMER_START_CHANGED: 'timer.startMove.CHANGED'
};

const UNSUPPORTED_KEY = 'timer.startMove.UNSUPPORTED';
const SAVE_FAILED_KEY = 'timer.startMove.SAVE_FAILED';

interface ApiErrorLike {
	statusCode?: number;
	errorCode?: string;
}

/** The message of a failed move: the API's reason when it gave one, else that the save failed. */
export function timerStartMoveRefusalKeyOf(error: unknown): string {
	const apiError = (error ?? {}) as ApiErrorLike;
	const reasonKey = apiError.errorCode ? REFUSAL_KEYS[apiError.errorCode] : undefined;
	if (reasonKey) {
		return reasonKey;
	}
	const routeIsMissing = apiError.statusCode === 404;
	if (routeIsMissing) {
		return UNSUPPORTED_KEY;
	}
	return SAVE_FAILED_KEY;
}

const TIME_TEXT = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** The time of a field on the day of `day`, in local time. */
function atTimeOn(day: Date, hours: number, minutes: number): Date {
	const moment = new Date(day);
	moment.setHours(hours, minutes, 0, 0);
	return moment;
}

/**
 * The start a time field asks for, in local time, or null when the field does not hold a time. A run that started
 * before midnight and still runs spans two days: the time is read on the day the run started or on the next one,
 * leaving out a moment later than `now`, and the one nearest the run's start is taken. A time later than now on both
 * days stays on the run's day, for the panel to refuse as a start in the future.
 */
export function startFromTimeText(runStart: Date, timeText: string, now: Date): Date | null {
	const match = TIME_TEXT.exec(timeText);
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const onRunDay = atTimeOn(runStart, hours, minutes);
	const nextDay = new Date(runStart);
	nextDay.setDate(nextDay.getDate() + 1);
	const onNextDay = atTimeOn(nextDay, hours, minutes);
	const notLaterThanNow = [onRunDay, onNextDay].filter((candidate) => candidate.getTime() <= now.getTime());
	if (notLaterThanNow.length === 0) {
		return onRunDay;
	}
	const distanceToRunStart = (candidate: Date) => Math.abs(candidate.getTime() - runStart.getTime());
	return notLaterThanNow.reduce((nearest, candidate) =>
		distanceToRunStart(candidate) < distanceToRunStart(nearest) ? candidate : nearest
	);
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/** A time as a time field writes it (`HH:mm`, local). */
export function timeTextOf(date: Date): string {
	return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

/** The proxy route lets a role through that runs the timer and may change tracked time, as Gauzy requires. */
export function holdsTimerStartMovePermissions(held: readonly string[]): boolean {
	const runsTheTimer = held.includes(TIME_TRACKER_PERMISSION);
	const mayModifyTime = held.includes(MODIFY_TIME_PERMISSION);
	return runsTheTimer && mayModifyTime;
}

/** The minute a date falls in. */
function minuteOf(date: Date): number {
	const minute = new Date(date);
	minute.setSeconds(0, 0);
	return minute.getTime();
}

/** Whether a start typed in a time field is the minute the run started: no change, its seconds left aside. */
export function isSameStartMinute(start: Date, runStart: Date): boolean {
	return minuteOf(start) === minuteOf(runStart);
}

interface LocalStartMoveCheck {
	start: Date;
	runStart: Date;
	now: Date;
	earlierAllowed: boolean;
	reasonRequired: boolean;
	reason: string;
}

/**
 * The refusal the panel can tell before it asks the API (a start later than now, an earlier start not allowed, a
 * missing reason), or null.
 */
export function localStartMoveRefusalKeyOf(check: LocalStartMoveCheck): string | null {
	const startsInTheFuture = check.start.getTime() > check.now.getTime();
	if (startsInTheFuture) {
		return REFUSAL_KEYS.TIMER_START_IN_FUTURE;
	}
	const movesEarlier = check.start.getTime() < minuteOf(check.runStart);
	const refusesEarlierStart = movesEarlier && !check.earlierAllowed;
	if (refusesEarlierStart) {
		return REFUSAL_KEYS.TIMER_START_MANUAL_NOT_ALLOWED;
	}
	const reasonIsMissing = check.reasonRequired && check.reason.trim() === '';
	if (reasonIsMissing) {
		return REFUSAL_KEYS.TIMER_START_REASON_REQUIRED;
	}
	return null;
}
