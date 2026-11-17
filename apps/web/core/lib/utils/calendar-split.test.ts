import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	clockTextOf,
	defaultSplitTimeOf,
	isSlotMark,
	nearestSlotMarksOf,
	slotMarksInside,
	splitPartsOf,
	splitRefusalOf,
	splitsOnSlots,
	splitTimeFromClock
} from './calendar-split';

function at(day: number, hour: number, minute = 0, second = 0) {
	return new Date(2026, 10, day, hour, minute, second);
}

function logOf(fields: Partial<ITimeLog>): ITimeLog {
	return { id: 'log-1', logType: ETimeLogType.MANUAL, isRunning: false, ...fields } as ITimeLog;
}

const NINE_TO_ONE = { start: at(9, 9), end: at(9, 13) };

describe('splitRefusalOf', () => {
	it('lets a stopped entry added by hand be split', () => {
		expect(splitRefusalOf(logOf({}), NINE_TO_ONE)).toBe('none');
	});

	it('refuses tracked time, which carries time slots and screenshots', () => {
		const tracked = logOf({ logType: ETimeLogType.TRACKED });

		expect(splitRefusalOf(tracked, NINE_TO_ONE)).toBe('tracked');
	});

	it('refuses a running entry, whatever its kind', () => {
		const running = logOf({ isRunning: true });

		expect(splitRefusalOf(running, NINE_TO_ONE)).toBe('running');
	});

	it('refuses an entry too short to make two parts of a minute or more', () => {
		const oneMinute = { start: at(9, 9), end: at(9, 9, 1) };

		expect(splitRefusalOf(logOf({}), oneMinute)).toBe('too-short');
	});

	it('refuses an entry on an approved day, whose time stays as it was approved', () => {
		const rules = { isOnApprovedDay: true, mayChangeTime: true };

		expect(splitRefusalOf(logOf({}), NINE_TO_ONE, rules)).toBe('approved');
	});

	it('refuses a viewer who may not both change recorded time and add time by hand', () => {
		const rules = { isOnApprovedDay: false, mayChangeTime: false };

		expect(splitRefusalOf(logOf({}), NINE_TO_ONE, rules)).toBe('permission');
	});

	it('names what the entry is before the rules of its day and of the viewer', () => {
		const tracked = logOf({ logType: ETimeLogType.TRACKED });
		const rules = { isOnApprovedDay: true, mayChangeTime: false };

		expect(splitRefusalOf(tracked, NINE_TO_ONE, rules)).toBe('tracked');
	});
});

describe('defaultSplitTimeOf', () => {
	it('is the middle of the entry', () => {
		expect(defaultSplitTimeOf(NINE_TO_ONE)).toEqual(at(9, 11));
	});

	it('falls on a whole minute', () => {
		const odd = { start: at(9, 9), end: at(9, 9, 5) };

		expect(defaultSplitTimeOf(odd)).toEqual(at(9, 9, 2));
	});
});

describe('splitTimeFromClock', () => {
	it('reads a time of the entry day', () => {
		expect(splitTimeFromClock(NINE_TO_ONE, '11:00')).toEqual(at(9, 11));
	});

	it('refuses a time at or outside the entry, which would leave an empty part', () => {
		expect(splitTimeFromClock(NINE_TO_ONE, '09:00')).toBeNull();
		expect(splitTimeFromClock(NINE_TO_ONE, '13:00')).toBeNull();
		expect(splitTimeFromClock(NINE_TO_ONE, '14:30')).toBeNull();
		expect(splitTimeFromClock(NINE_TO_ONE, '')).toBeNull();
	});

	it('reads a time after midnight on the next day, for an entry that crosses it', () => {
		const lateNight = { start: at(9, 22), end: at(10, 2) };

		expect(splitTimeFromClock(lateNight, '01:00')).toEqual(at(10, 1));
		expect(splitTimeFromClock(lateNight, '23:00')).toEqual(at(9, 23));
	});
});

describe('splitPartsOf', () => {
	it('makes two parts that meet at the split time and cover the whole entry', () => {
		const parts = splitPartsOf(NINE_TO_ONE, at(9, 11));

		expect(parts.first).toEqual({ start: at(9, 9), end: at(9, 11) });
		expect(parts.second).toEqual({ start: at(9, 11), end: at(9, 13) });
	});
});

describe('clockTextOf', () => {
	it('writes a time the way a time field reads it', () => {
		expect(clockTextOf(at(9, 9, 5))).toBe('09:05');
		expect(clockTextOf(at(9, 14, 30))).toBe('14:30');
	});
});

describe('tracked time, split on its slots through the API (#5369)', () => {
	const tracked = logOf({ logType: ETimeLogType.TRACKED });
	const withApiSplit = { isOnApprovedDay: false, mayChangeTime: true, canSplitTracked: true };

	it('lets a stopped tracked entry be split where the API splits it', () => {
		expect(splitRefusalOf(tracked, NINE_TO_ONE, withApiSplit)).toBe('none');
	});

	it('still refuses it with the rules of its day and of the viewer', () => {
		expect(splitRefusalOf(tracked, NINE_TO_ONE, { ...withApiSplit, isOnApprovedDay: true })).toBe('approved');
		expect(splitRefusalOf(tracked, NINE_TO_ONE, { ...withApiSplit, mayChangeTime: false })).toBe('permission');
	});

	it('refuses a tracked entry with no slot mark inside it as too short', () => {
		const insideOneSlot = { start: at(9, 9, 1), end: at(9, 9, 9) };

		expect(splitRefusalOf(tracked, insideOneSlot, withApiSplit)).toBe('too-short');
	});

	it('splits tracked time on slots, and time added by hand at any minute', () => {
		expect(splitsOnSlots(tracked)).toBe(true);
		expect(splitsOnSlots(logOf({}))).toBe(false);
	});

	it('reads 11:00 and 11:10 as slot marks, never 11:05', () => {
		expect(isSlotMark(at(9, 11))).toBe(true);
		expect(isSlotMark(at(9, 11, 10))).toBe(true);
		expect(isSlotMark(at(9, 11, 5))).toBe(false);
	});

	it('opens a tracked entry on the slot mark nearest to its middle', () => {
		expect(defaultSplitTimeOf(NINE_TO_ONE, true)).toEqual(at(9, 11));
		expect(defaultSplitTimeOf({ start: at(9, 9, 3), end: at(9, 9, 58) }, true)).toEqual(at(9, 9, 30));
	});

	it('names the slot marks either side of a time off them: 10:50... 11:00 and 11:10 around 11:05', () => {
		expect(nearestSlotMarksOf(NINE_TO_ONE, at(9, 11, 5))).toEqual({ before: at(9, 11), after: at(9, 11, 10) });
	});

	it('keeps only the slot marks that leave a minute on each side', () => {
		const short = { start: at(9, 9, 8, 30), end: at(9, 9, 21, 30) };

		expect(slotMarksInside(short)).toEqual([at(9, 9, 10), at(9, 9, 20)]);
		expect(slotMarksInside({ start: at(9, 9, 9, 30), end: at(9, 9, 10, 30) })).toEqual([]);
	});
});
