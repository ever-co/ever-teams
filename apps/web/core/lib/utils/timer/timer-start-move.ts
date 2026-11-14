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
	allowManualTime?: boolean;
	allowModifyTime?: boolean;
	requireReason?: boolean;
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

	const roleMayModifyTime = input.permissions.includes(MODIFY_TIME_PERMISSION);
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

/**
 * The start a time field asks for: the time on the day the run started, in local time, or null when the field does
 * not hold a time.
 */
export function startFromTimeText(runStart: Date, timeText: string): Date | null {
	const match = TIME_TEXT.exec(timeText);
	if (!match) {
		return null;
	}
	const start = new Date(runStart);
	start.setHours(Number(match[1]), Number(match[2]), 0, 0);
	return start;
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
