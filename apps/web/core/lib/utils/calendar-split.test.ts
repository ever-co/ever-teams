import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { clockTextOf, defaultSplitTimeOf, splitPartsOf, splitRefusalOf, splitTimeFromClock } from './calendar-split';

function at(day: number, hour: number, minute = 0) {
	return new Date(2026, 10, day, hour, minute);
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
