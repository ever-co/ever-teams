import { addDays, startOfDay } from 'date-fns';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { minutesOfClockText } from './dashboards/manual-time-entry';
import type { TimeWindow } from './dashboards/timesheet-sheet-edit';
import { isManualLog } from './dashboards/timesheets';

const MILLISECONDS_PER_MINUTE = 60_000;

/** Each part keeps at least this much time, so neither is an empty entry. */
const SMALLEST_PART_MINUTES = 1;

/** The minutes of one time slot: tracked time is split on their marks, so each slot goes whole to one part. */
export const SLOT_MINUTES = 10;

const MILLISECONDS_PER_SLOT = SLOT_MINUTES * MILLISECONDS_PER_MINUTE;

/**
 * Why an entry cannot be split in the web: tracked time needs the API's split (ever-co/ever-gauzy#12030), which shares
 * its time slots and screenshots between the two entries, a running entry has no end yet, and a part must last a
 * minute or more (on a slot mark, for tracked time). Approved time stays as it was approved, and the viewer must be
 * allowed to change the time.
 */
export type SplitRefusal = 'none' | 'tracked' | 'running' | 'too-short' | 'approved' | 'permission';

/** What the page knows of the entry's days, of the viewer and of the API. */
interface SplitRules {
	isOnApprovedDay: boolean;
	/** The viewer may change recorded time (and add time by hand, where the split adds the rest by hand). */
	mayChangeTime: boolean;
	/** The API splits an entry in one write, its slots included: tracked time can be split. */
	canSplitTracked?: boolean;
}

const NO_LIMITS: SplitRules = { isOnApprovedDay: false, mayChangeTime: true };

/** Whether an entry is split on slot marks: tracked time, whose slots carry its screenshots and activity. */
export function splitsOnSlots(log: ITimeLog): boolean {
	return !isManualLog(log);
}

/** Whether a moment is a slot mark: a whole ten minutes of the clock the API keeps its slots on, with no seconds. */
export function isSlotMark(time: Date): boolean {
	return time.getTime() % MILLISECONDS_PER_SLOT === 0;
}

function slotMarkAtOrBefore(time: Date): Date {
	const milliseconds = time.getTime();
	return new Date(milliseconds - (milliseconds % MILLISECONDS_PER_SLOT));
}

function leavesBothParts(window: TimeWindow, splitAt: Date) {
	const smallestPartMilliseconds = SMALLEST_PART_MINUTES * MILLISECONDS_PER_MINUTE;
	const earliest = window.start.getTime() + smallestPartMilliseconds;
	const latest = window.end.getTime() - smallestPartMilliseconds;
	const time = splitAt.getTime();
	return time >= earliest && time <= latest;
}

/** The slot marks inside the entry that leave a part of a minute or more on each side, earliest first. */
export function slotMarksInside(window: TimeWindow): Date[] {
	const marks: Date[] = [];
	let mark = new Date(slotMarkAtOrBefore(window.start).getTime() + MILLISECONDS_PER_SLOT);
	while (mark.getTime() < window.end.getTime()) {
		if (leavesBothParts(window, mark)) {
			marks.push(mark);
		}
		mark = new Date(mark.getTime() + MILLISECONDS_PER_SLOT);
	}
	return marks;
}

/** The slot marks nearest to a time off them that split the entry, one before and one after, when there are. */
export function nearestSlotMarksOf(window: TimeWindow, time: Date): { before: Date | null; after: Date | null } {
	const marks = slotMarksInside(window);
	const before = marks.findLast((mark) => mark.getTime() < time.getTime()) ?? null;
	const after = marks.find((mark) => mark.getTime() > time.getTime()) ?? null;
	return { before, after };
}

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
	const isTracked = splitsOnSlots(log);
	const canSplitTracked = rules.canSplitTracked === true;
	if (isTracked && !canSplitTracked) {
		return 'tracked';
	}
	const smallestEntryMinutes = SMALLEST_PART_MINUTES * 2;
	const isTooShort = wholeMinutesOf(window) < smallestEntryMinutes;
	const hasNoSlotMark = isTracked && slotMarksInside(window).length === 0;
	if (isTooShort || hasNoSlotMark) {
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

/**
 * What the split dialog opens with: the middle of the entry on a whole minute, or, for an entry split on its slots,
 * the slot mark nearest to that middle.
 */
export function defaultSplitTimeOf(window: TimeWindow, onSlots = false): Date {
	const halfMinutes = Math.floor(wholeMinutesOf(window) / 2);
	const middle = window.start.getTime() + halfMinutes * MILLISECONDS_PER_MINUTE;
	const onWholeMinute = new Date(Math.floor(middle / MILLISECONDS_PER_MINUTE) * MILLISECONDS_PER_MINUTE);
	if (!onSlots) {
		return onWholeMinute;
	}
	const marks = slotMarksInside(window);
	if (marks.length === 0) {
		return onWholeMinute;
	}
	const distanceOf = (mark: Date) => Math.abs(mark.getTime() - onWholeMinute.getTime());
	return marks.reduce((nearest, mark) => {
		if (distanceOf(mark) < distanceOf(nearest)) {
			return mark;
		}
		return nearest;
	}, marks[0]);
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
	if (leavesBothParts(window, sameDay)) {
		return sameDay;
	}
	const nextDay = clockTimeOn(addDays(window.start, 1), minutes);
	if (leavesBothParts(window, nextDay)) {
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
