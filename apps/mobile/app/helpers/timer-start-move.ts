import type { TxKeyPath } from '../i18n/i18n';
import { TimerSource } from '../services/interfaces/ITimer';

/** The permission the timer's routes ask for. */
const TIME_TRACKER_PERMISSION = 'TIME_TRACKER';

/** The permission the API asks for any move of a running timer's start. */
const MODIFY_TIME_PERMISSION = 'ALLOW_MODIFY_TIME';

/** The permission the API asks for an earlier start, whose added minutes count as time added by hand. */
const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';

/** The longest reason a time log keeps (its `reason` column is a 255-character string on MySQL). */
export const TIMER_START_REASON_MAX_LENGTH = 255;

/**
 * Whether the API behind the app can move a running timer's start (`PUT /timesheet/timer/started-at`), learnt from
 * one check: `checking` until it answers.
 */
export type TimerStartMoveSupport = 'checking' | 'supported' | 'unsupported';

/** Why the panel shows the start alone. */
export type TimerStartViewReason = 'tracker' | 'not-allowed' | 'unsupported' | 'checking';

/** What the running time's panel offers: the field, or the start alone with the reason it cannot change here. */
export type TimerStartMoveAccess =
	| { kind: 'edit'; earlierAllowed: boolean; reasonRequired: boolean }
	| { kind: 'view'; why: TimerStartViewReason };

/** The organization's rules on tracked time, as the organization record carries them. */
export interface ITimePolicy {
	allowManualTime?: boolean | null;
	allowModifyTime?: boolean | null;
	requireReason?: boolean | null;
}

interface ITimerStartMoveAccessInput {
	/** Where the running log was started. */
	source: TimerSource | string | null | undefined;
	support: TimerStartMoveSupport;
	/** The permissions the session's role holds, enabled ones only. */
	permissions: readonly string[];
	organization: ITimePolicy | null | undefined;
}

/** Whether the role runs the timer and may change tracked time, as the API requires for a move. */
function holdsTimerStartMovePermissions(held: readonly string[]): boolean {
	const runsTheTimer = held.includes(TIME_TRACKER_PERMISSION);
	const mayModifyTime = held.includes(MODIFY_TIME_PERMISSION);
	return runsTheTimer && mayModifyTime;
}

/**
 * What the panel of the running time offers, following the rules the API applies to a move of the start: the desktop
 * app records its own time, a switch of the organization that is not on refuses (as the API reads it), the role needs
 * the permission to change tracked time, and an earlier start adds time by hand.
 */
export function timerStartMoveAccessOf(input: ITimerStartMoveAccessInput): TimerStartMoveAccess {
	const isTrackerRun = input.source === TimerSource.DESKTOP;
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
export function timerStartMoveSupportOf(status: number): TimerStartMoveSupport {
	const routeIsMissing = status === 404;
	if (routeIsMissing) {
		return 'unsupported';
	}
	return 'supported';
}

/** The message of each refusal code the API answers a move of the running start with. */
const REFUSAL_KEYS: Readonly<Record<string, TxKeyPath>> = {
	TIMER_NOT_RUNNING: 'timer.startMove.notRunning',
	TIMER_START_TRACKER_RUN: 'timer.startMove.trackerRun',
	TIMER_START_IN_FUTURE: 'timer.startMove.inFuture',
	TIMER_START_EDIT_NOT_ALLOWED: 'timer.startMove.editNotAllowed',
	TIMER_START_MANUAL_NOT_ALLOWED: 'timer.startMove.manualNotAllowed',
	TIMER_START_REASON_REQUIRED: 'timer.startMove.reasonRequired',
	TIMER_START_REASON_TOO_LONG: 'timer.startMove.reasonTooLong',
	TIMER_START_OVERLAP: 'timer.startMove.overlap',
	TIMER_START_CHANGED: 'timer.startMove.changed'
};

/** An answer of the API to a move: its status, null when the request never reached it, and its code. */
interface IStartMoveAnswer {
	status: number | null;
	code?: string;
}

/** The message of a failed move: the API's reason when it gave one, else why the save did not happen. */
export function timerStartMoveRefusalKeyOf({ status, code }: IStartMoveAnswer): TxKeyPath {
	if (status === null) {
		return 'timer.startMove.offline';
	}
	const reasonKey = code ? REFUSAL_KEYS[code] : undefined;
	if (reasonKey) {
		return reasonKey;
	}
	const routeIsMissing = status === 404;
	if (routeIsMissing) {
		return 'timer.startMove.unsupported';
	}
	return 'timer.startMove.saveFailed';
}

/** A time typed as `9:05` or `09:05`, from 00:00 to 23:59. */
const TIME_TEXT = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** The time of a field on the day of `day`, in local time. */
function atTimeOn(day: Date, hours: number, minutes: number): Date {
	const moment = new Date(day);
	moment.setHours(hours, minutes, 0, 0);
	return moment;
}

/** The start of the day of `moment`, in local time. */
function dayOf(moment: Date): Date {
	return atTimeOn(moment, 0, 0);
}

/** The start of the day after `day`, in local time. */
function dayAfter(day: Date): Date {
	const next = new Date(day);
	next.setDate(next.getDate() + 1);
	return dayOf(next);
}

/**
 * The days a run spans, from the day it started to today, each at its local midnight. A run that started before
 * midnight and still runs spans two days or more: a time typed alone could then mean either, so the panel asks which
 * day the new start is on, and never guesses.
 */
export function daysOfRun(runStart: Date, now: Date): Date[] {
	const days = [dayOf(runStart)];
	const today = dayOf(now).getTime();
	let next = dayAfter(days[0]);
	while (next.getTime() <= today) {
		days.push(next);
		next = dayAfter(next);
	}
	return days;
}

/**
 * The start a time field asks for on `day`, in local time, or null when the field does not hold a time, or holds one
 * the clocks skip that day (02:30 where they go forward from 02:00 to 03:00): it is never read as an hour later.
 */
export function startOnDay(day: Date, timeText: string): Date | null {
	const match = TIME_TEXT.exec(timeText.trim());
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const start = atTimeOn(day, hours, minutes);
	const keepsTypedTime =
		start.getDate() === day.getDate() && start.getHours() === hours && start.getMinutes() === minutes;
	return keepsTypedTime ? start : null;
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * What the person typed, as the field writes a time: Android has no keyboard of digits and a colon, so the field keeps
 * the digits and places the colon before the last two ("905" reads "9:05").
 */
export function timeTextFromTyping(typed: string): string {
	const digits = typed.replace(/\D/g, '').slice(0, 4);
	if (digits.length <= 2) {
		return digits;
	}
	return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
}

/** A time as the field writes it (`HH:mm`, local). */
export function timeTextOf(date: Date): string {
	return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

/** The minute a date falls in. */
function minuteOf(date: Date): number {
	const minute = new Date(date);
	minute.setSeconds(0, 0);
	return minute.getTime();
}

/** Whether a start typed in the field is the minute the run started: no change, its seconds left aside. */
export function isSameStartMinute(start: Date, runStart: Date): boolean {
	return minuteOf(start) === minuteOf(runStart);
}

interface ILocalStartMoveCheck {
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
export function localStartMoveRefusalKeyOf(check: ILocalStartMoveCheck): TxKeyPath | null {
	const startsInTheFuture = check.start.getTime() > check.now.getTime();
	if (startsInTheFuture) {
		return 'timer.startMove.inFuture';
	}
	const movesEarlier = check.start.getTime() < minuteOf(check.runStart);
	const refusesEarlierStart = movesEarlier && !check.earlierAllowed;
	if (refusesEarlierStart) {
		return 'timer.startMove.manualNotAllowed';
	}
	const reasonIsMissing = check.reasonRequired && check.reason.trim() === '';
	if (reasonIsMissing) {
		return 'timer.startMove.reasonRequired';
	}
	return null;
}
