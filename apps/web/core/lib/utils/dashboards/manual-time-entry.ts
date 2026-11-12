import { requiredTrackingFieldsOf } from '@/core/lib/helpers/timer-errors';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	busyWindowsOf,
	type DayBounds,
	dayBoundsOf,
	freeWindowsBetween,
	parseDurationInput,
	placementLimitOf,
	singlePlacementOf,
	type TimeWindow
} from './timesheet-sheet-edit';

const MILLISECONDS_PER_MINUTE = 60_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const NOON_HOUR = 12;

export type TypedDuration = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'duration'; seconds: number };

export function typedDurationOf(text: string): TypedDuration {
	const seconds = parseDurationInput(text);
	if (seconds === null) {
		return { kind: 'invalid' };
	}
	if (seconds === 0) {
		return { kind: 'empty' };
	}
	return { kind: 'duration', seconds };
}

export interface IntervalRequest {
	seconds: number;
	day: Date;
	memberLogs: ReadonlyArray<ITimeLog>;
	/** Intervals the same form already holds, kept out of the proposal like saved entries. */
	claimed: ReadonlyArray<TimeWindow>;
	now: Date;
	allowsFutureDates: boolean;
}

export type IntervalProposal =
	| { status: 'closedDay' }
	| { status: 'noRoom' }
	| { status: 'ready'; interval: TimeWindow };

/** A form writes the start and the end as two times of one day, so its interval ends by 23:59. */
function formLimitOf(bounds: DayBounds, now: Date, allowsFutureDates: boolean): Date {
	const placementLimit = placementLimitOf(bounds, now, allowsFutureDates);
	const lastMinuteTime = bounds.end.getTime() - MILLISECONDS_PER_MINUTE;
	const limitTime = Math.min(placementLimit.getTime(), lastMinuteTime);
	return new Date(limitTime);
}

/**
 * Whether a form saves this moment as it is. A form holds a time as an hour and a minute of the day and reads it
 * back as the first moment of the day with that time. On the day the clock goes back an hour comes twice: a moment
 * of the second one would be saved an hour earlier.
 */
function isSavedAsItself(moment: Date, day: Date) {
	const minutes = minutesOfDayOf(moment);
	const readBack = dateAtMinutes(day, minutes);
	return readBack.getTime() === moment.getTime();
}

function canFormSave(interval: TimeWindow, day: Date) {
	const savesStart = isSavedAsItself(interval.start, day);
	const savesEnd = isSavedAsItself(interval.end, day);
	return savesStart && savesEnd;
}

/**
 * The interval a form proposes for a typed duration: one free stretch of the member's day, so the entry overlaps
 * nothing (Gauzy deletes what a manual entry overlaps). A day after today is closed when the organization refuses
 * time in the future. An interval the form would save as another one is not proposed.
 */
export function intervalProposalOf(request: IntervalRequest): IntervalProposal {
	const bounds = dayBoundsOf(request.day);
	const limit = formLimitOf(bounds, request.now, request.allowsFutureDates);
	const isClosedDay = limit.getTime() <= bounds.start.getTime();
	if (isClosedDay) {
		return { status: 'closedDay' };
	}
	const logBusy = busyWindowsOf(request.memberLogs, bounds);
	const busy = [...logBusy, ...request.claimed];
	const freeWindows = freeWindowsBetween(busy, bounds, limit);
	const interval = singlePlacementOf(request.seconds, freeWindows, request.day);
	if (!interval) {
		return { status: 'noRoom' };
	}
	if (!canFormSave(interval, request.day)) {
		return { status: 'noRoom' };
	}
	return { status: 'ready', interval };
}

export function minutesOfDayOf(date: Date) {
	const hourMinutes = date.getHours() * MINUTES_PER_HOUR;
	return hourMinutes + date.getMinutes();
}

const CLOCK_TEXT = /^(\d{1,2}):(\d{2})$/;

export function minutesOfClockText(text: string): number | null {
	const match = CLOCK_TEXT.exec(text);
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const hourMinutes = hours * MINUTES_PER_HOUR;
	return hourMinutes + minutes;
}

/** The start and the end a form shows, as minutes of the day; null while a field is empty. */
export interface ShownTimes {
	startMinutes: number | null;
	endMinutes: number | null;
}

const NO_TIMES: ShownTimes = { startMinutes: null, endMinutes: null };

/**
 * The time from the start to the end a form shows, as it passes on that day: where the clock changes, a day lasts an
 * hour more or less than its clock tells, and the entry is saved with the time that really passed. While no day is
 * picked, only the clock can be counted.
 */
export function spanSecondsOf(shown: ShownTimes, day: Date | null): number | null {
	const { startMinutes, endMinutes } = shown;
	if (startMinutes === null) {
		return null;
	}
	if (endMinutes === null) {
		return null;
	}
	const clockMinutes = endMinutes - startMinutes;
	if (clockMinutes <= 0) {
		return null;
	}
	if (!day) {
		return clockMinutes * SECONDS_PER_MINUTE;
	}
	const start = dateAtMinutes(day, startMinutes);
	const end = dateAtMinutes(day, endMinutes);
	const milliseconds = end.getTime() - start.getTime();
	if (milliseconds <= 0) {
		return null;
	}
	const passedMinutes = milliseconds / MILLISECONDS_PER_MINUTE;
	return passedMinutes * SECONDS_PER_MINUTE;
}

function timesOfInterval(interval: TimeWindow): ShownTimes {
	const startMinutes = minutesOfDayOf(interval.start);
	const endMinutes = minutesOfDayOf(interval.end);
	return { startMinutes, endMinutes };
}

function isSameTimes(first: ShownTimes, second: ShownTimes) {
	const isSameStart = first.startMinutes === second.startMinutes;
	const isSameEnd = first.endMinutes === second.endMinutes;
	return isSameStart && isSameEnd;
}

/**
 * Where a typed duration stands. Text that is no duration, or a duration typed before a member is picked, leaves the
 * form's times as they were (`shown`). Any other duration empties them until an interval is proposed, so the form
 * cannot save the previous times in its place.
 */
export type DurationPhase =
	| { kind: 'idle' }
	| { kind: 'invalid'; text: string; shown: ShownTimes }
	| { kind: 'noMember'; seconds: number; shown: ShownTimes }
	| { kind: 'reading'; seconds: number }
	| { kind: 'proposed'; seconds: number; interval: TimeWindow }
	| { kind: 'noRoom'; seconds: number }
	| { kind: 'closedDay'; seconds: number }
	| { kind: 'failed'; seconds: number };

export const IDLE_PHASE: DurationPhase = { kind: 'idle' };

function timesOfPhase(phase: Exclude<DurationPhase, { kind: 'idle' }>): ShownTimes {
	if (phase.kind === 'proposed') {
		return timesOfInterval(phase.interval);
	}
	const keepsShownTimes = phase.kind === 'invalid' || phase.kind === 'noMember';
	if (keepsShownTimes) {
		return phase.shown;
	}
	return NO_TIMES;
}

/**
 * The phase that still applies: a typed duration decides the form's times until the member changes the start or the
 * end by hand. From then on the form is back to its own times.
 */
export function standingPhaseOf(phase: DurationPhase, shown: ShownTimes): DurationPhase {
	if (phase.kind === 'idle') {
		return phase;
	}
	const expected = timesOfPhase(phase);
	if (isSameTimes(expected, shown)) {
		return phase;
	}
	return IDLE_PHASE;
}

/**
 * Whether the form must not be saved as it stands: the field reports a duration it could not apply (text that is no
 * duration, or no member to read the day of) while the form still holds its earlier start and end. Saving would
 * record those times, not the duration the field shows. Fixing or clearing the text, or picking the times by hand,
 * lifts it.
 */
export function blocksSaveOf(phase: DurationPhase): boolean {
	return phase.kind === 'invalid' || phase.kind === 'noMember';
}

export function askedSecondsOf(phase: DurationPhase): number | null {
	if (phase.kind === 'idle') {
		return null;
	}
	if (phase.kind === 'invalid') {
		return null;
	}
	return phase.seconds;
}

/**
 * What the duration field reads while nothing is being typed: the refused text, the duration still asked for, or
 * the time from the start to the end the form shows.
 */
export function restingDurationTextOf(phase: DurationPhase, shown: ShownTimes, day: Date | null): string {
	if (phase.kind === 'invalid') {
		return phase.text;
	}
	const askedSeconds = askedSecondsOf(phase);
	const hasInterval = phase.kind === 'proposed';
	const isAskedOnly = askedSeconds !== null && !hasInterval;
	if (isAskedOnly) {
		return formatDurationShort(askedSeconds);
	}
	const spanSeconds = spanSecondsOf(shown, day);
	if (spanSeconds === null) {
		return '';
	}
	return formatDurationShort(spanSeconds);
}

export interface FormPeriod {
	day: Date | null;
	times: ShownTimes;
}

function dateAtMinutes(day: Date, minutes: number) {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
}

function intervalOfPeriod(period: FormPeriod): TimeWindow | null {
	const { day, times } = period;
	const { startMinutes, endMinutes } = times;
	if (!day) {
		return null;
	}
	if (startMinutes === null || endMinutes === null) {
		return null;
	}
	const endsAfterStart = endMinutes > startMinutes;
	if (!endsAfterStart) {
		return null;
	}
	const start = dateAtMinutes(day, startMinutes);
	const end = dateAtMinutes(day, endMinutes);
	return { start, end };
}

export function claimedIntervalsOf(periods: ReadonlyArray<FormPeriod>, index: number): TimeWindow[] {
	const claimed: TimeWindow[] = [];
	for (const [position, period] of periods.entries()) {
		const isOtherPeriod = position !== index;
		const interval = intervalOfPeriod(period);
		if (isOtherPeriod && interval) {
			claimed.push(interval);
		}
	}
	return claimed;
}

function dayPeriodOf(hour: number) {
	if (hour < NOON_HOUR) {
		return 'AM';
	}
	return 'PM';
}

function hourOnClockOf(hour: number) {
	const hourOfPeriod = hour % NOON_HOUR;
	if (hourOfPeriod === 0) {
		return NOON_HOUR;
	}
	return hourOfPeriod;
}

/** A time written as the time entry dialog lists its starts and ends: `01:30:00 PM`. */
export function timeOptionOf(date: Date): string {
	const hour = date.getHours();
	const hourOnClock = hourOnClockOf(hour);
	const hourText = String(hourOnClock).padStart(2, '0');
	const minuteText = String(date.getMinutes()).padStart(2, '0');
	const period = dayPeriodOf(hour);
	return `${hourText}:${minuteText}:00 ${period}`;
}

/**
 * The dialog's list of times, with the picked ones it lacks (a proposed interval can start or end between two of
 * its steps), in time order.
 */
export function timeOptionsWith(
	options: ReadonlyArray<string>,
	picked: ReadonlyArray<string>,
	minutesOf: (option: string) => number
): string[] {
	const missing = new Set<string>();
	for (const option of picked) {
		const isPicked = option !== '';
		const isListed = options.includes(option);
		const isMissing = isPicked && !isListed;
		if (isMissing) {
			missing.add(option);
		}
	}
	if (missing.size === 0) {
		return [...options];
	}
	const all = [...options, ...missing];
	return all.sort((first, second) => minutesOf(first) - minutesOf(second));
}

export type AddTimeScope = 'none' | 'own' | 'anyone';

/** The only member an Add time form records time for. */
export interface FixedMember {
	employeeId: string;
	name: string;
}

export interface AddTimeFacts {
	hasOrganizationRole: boolean;
	hasManualTimePermission: boolean;
	ownEmployeeId: string | null;
	/** The organization's manual time switch; unknown counts as on, the API decides. */
	allowsManualTime: boolean;
}

/**
 * Whose time the Add time action of Timesheets records. An organization role adds time for any member, as before. A
 * member with the manual time permission (a team manager, on this page) adds their own only. Nobody adds time once
 * the organization turns manual time off.
 */
export function addTimeScopeOf(facts: AddTimeFacts): AddTimeScope {
	if (!facts.allowsManualTime) {
		return 'none';
	}
	if (facts.hasOrganizationRole) {
		return 'anyone';
	}
	const hasOwnEmployee = Boolean(facts.ownEmployeeId);
	const canAddOwnTime = facts.hasManualTimePermission && hasOwnEmployee;
	if (canAddOwnTime) {
		return 'own';
	}
	return 'none';
}

const TEAM_FIELD = 'organizationTeamId';
const PROJECT_FIELD = 'projectId';

function requiredFieldsKeyOf(fields: ReadonlyArray<string>): string | null {
	const missesTeam = fields.includes(TEAM_FIELD);
	const missesProject = fields.includes(PROJECT_FIELD);
	const missesBoth = missesTeam && missesProject;
	if (missesBoth) {
		return 'manualTime.REQUIRED.TEAM_AND_PROJECT';
	}
	if (missesTeam) {
		return 'manualTime.REQUIRED.TEAM';
	}
	if (missesProject) {
		return 'manualTime.REQUIRED.PROJECT';
	}
	return null;
}

/**
 * The sentence that says why manual time was not saved: the field the organization requires and the entry misses,
 * or else the reason every failed request gets.
 */
export function manualTimeRefusalKeyOf(error: unknown): string {
	const missingFields = requiredTrackingFieldsOf(error) ?? [];
	const requiredKey = requiredFieldsKeyOf(missingFields);
	if (requiredKey) {
		return requiredKey;
	}
	return errorReasonKeyOf(error);
}
