import { addDays, startOfDay } from 'date-fns';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { minutesOfClockText } from './dashboards/manual-time-entry';
import type { TimeWindow } from './dashboards/timesheet-sheet-edit';
import { isManualLog } from './dashboards/timesheets';

const MILLISECONDS_PER_MINUTE = 60_000;

/** Each part keeps at least this much time, so neither is an empty entry. */
const SMALLEST_PART_MINUTES = 1;

/**
 * Why an entry cannot be split in the web: tracked time carries time slots and screenshots that only the API can
 * share between two entries, a running entry has no end yet, and a part must last a minute or more. Approved time
 * stays as it was approved, and a split both changes recorded time and adds time by hand.
 */
export type SplitRefusal = 'none' | 'tracked' | 'running' | 'too-short' | 'approved' | 'permission';

/** What the page knows of the entry's days and of the viewer. */
interface SplitRules {
	isOnApprovedDay: boolean;
	/** The viewer may change recorded time and add time by hand. */
	mayChangeTime: boolean;
}

const NO_LIMITS: SplitRules = { isOnApprovedDay: false, mayChangeTime: true };

interface SplitParts {
	first: TimeWindow;
	second: TimeWindow;
}

function wholeMinutesOf(window: TimeWindow) {
	const elapsedMilliseconds = window.end.getTime() - window.start.getTime();
	return Math.floor(elapsedMilliseconds / MILLISECONDS_PER_MINUTE);
}

/** What the entry is comes first: it says why no one could split it, before the rules of its day and of the viewer. */
export function splitRefusalOf(log: ITimeLog, window: TimeWindow, rules: SplitRules = NO_LIMITS): SplitRefusal {
	if (log.isRunning) {
		return 'running';
	}
	if (!isManualLog(log)) {
		return 'tracked';
	}
	const smallestEntryMinutes = SMALLEST_PART_MINUTES * 2;
	const isTooShort = wholeMinutesOf(window) < smallestEntryMinutes;
	if (isTooShort) {
		return 'too-short';
	}
	if (rules.isOnApprovedDay) {
		return 'approved';
	}
	if (!rules.mayChangeTime) {
		return 'permission';
	}
	return 'none';
}

function isInsideWithParts(window: TimeWindow, splitAt: Date) {
	const smallestPartMilliseconds = SMALLEST_PART_MINUTES * MILLISECONDS_PER_MINUTE;
	const earliest = window.start.getTime() + smallestPartMilliseconds;
	const latest = window.end.getTime() - smallestPartMilliseconds;
	const time = splitAt.getTime();
	return time >= earliest && time <= latest;
}

/** The middle of the entry, on a whole minute: what the split dialog opens with. */
export function defaultSplitTimeOf(window: TimeWindow): Date {
	const halfMinutes = Math.floor(wholeMinutesOf(window) / 2);
	const middle = window.start.getTime() + halfMinutes * MILLISECONDS_PER_MINUTE;
	const onWholeMinute = Math.floor(middle / MILLISECONDS_PER_MINUTE) * MILLISECONDS_PER_MINUTE;
	return new Date(onWholeMinute);
}

function clockTimeOn(day: Date, minutes: number) {
	const dayStart = startOfDay(day);
	const time = new Date(dayStart);
	time.setMinutes(minutes);
	return time;
}

/**
 * The moment a time field means inside the entry: that time on the entry's first day, or on the next one for an
 * entry that crosses midnight. Null when it leaves no part of a minute or more on each side.
 */
export function splitTimeFromClock(window: TimeWindow, clockText: string): Date | null {
	const minutes = minutesOfClockText(clockText);
	if (minutes === null) {
		return null;
	}
	const sameDay = clockTimeOn(window.start, minutes);
	if (isInsideWithParts(window, sameDay)) {
		return sameDay;
	}
	const nextDay = clockTimeOn(addDays(window.start, 1), minutes);
	if (isInsideWithParts(window, nextDay)) {
		return nextDay;
	}
	return null;
}

export function splitPartsOf(window: TimeWindow, splitAt: Date): SplitParts {
	return {
		first: { start: window.start, end: splitAt },
		second: { start: splitAt, end: window.end }
	};
}

function twoDigits(value: number) {
	return String(value).padStart(2, '0');
}

/** "09:05": how a time field shows a moment. */
export function clockTextOf(time: Date) {
	return `${twoDigits(time.getHours())}:${twoDigits(time.getMinutes())}`;
}
