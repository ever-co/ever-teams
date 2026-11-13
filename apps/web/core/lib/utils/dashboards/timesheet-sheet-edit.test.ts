import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	approvedDayKeysOf,
	busyWindowsOf,
	cellLockOf,
	copyFitOf,
	copyPlanOf,
	dayBoundsOf,
	freeSecondsOf,
	freeWindowsBetween,
	parseDurationInput,
	placementLimitOf,
	placementOf,
	reductionOf,
	type SheetEditRules,
	sheetCellKeyOf,
	singlePlacementOf
} from './timesheet-sheet-edit';
import { rowIdentityOfLog, type SheetDay } from './timesheets';

const HOUR = 3600;
const MINUTE = 60;

function at(hours: number, minutes = 0) {
	return new Date(2026, 10, 10, hours, minutes);
}

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log',
		duration: 0,
		version: '1',
		logType: ETimeLogType.TRACKED,
		employeeId: 'member',
		...overrides
	};
}

function dayOf(date: Date, key: string): SheetDay {
	return { key, date, isToday: false, isWeekend: false };
}

const OPEN_RULES: SheetEditRules = {
	isLoading: false,
	isFiltered: false,
	canWrite: true,
	allowsManualTime: true,
	allowsFutureDates: false,
	approvedDayKeys: new Set(),
	now: new Date(2026, 10, 11, 12, 0)
};

describe('parseDurationInput', () => {
	it.each([
		['', 0],
		['2', 2 * HOUR],
		['1.5', HOUR + 30 * MINUTE],
		['1,5', HOUR + 30 * MINUTE],
		['1:30', HOUR + 30 * MINUTE],
		['1h30', HOUR + 30 * MINUTE],
		['1h 30m', HOUR + 30 * MINUTE],
		['6h 05m', 6 * HOUR + 5 * MINUTE],
		['90m', HOUR + 30 * MINUTE],
		['45 min', 45 * MINUTE],
		['24', 24 * HOUR]
	])('reads %p', (text, seconds) => {
		expect(parseDurationInput(text)).toBe(seconds);
	});

	it.each(['abc', '1:75', '25', '1h 90m', '-1'])('refuses %p', (text) => {
		expect(parseDurationInput(text)).toBeNull();
	});
});

describe('free windows and placement', () => {
	const bounds = dayBoundsOf(at(0));

	it('never places time over an existing entry, starting at 09:00', () => {
		const logs = [logOf({ id: 'morning', startedAt: at(9), stoppedAt: at(10, 30) })];
		const free = freeWindowsBetween(busyWindowsOf(logs, bounds), bounds, bounds.end);
		const pieces = placementOf(2 * HOUR, free, at(0));

		expect(pieces).toEqual([{ start: at(10, 30), end: at(12, 30) }]);
	});

	it('fills before 09:00 when the rest of the day is full, nearest to 09:00 first', () => {
		const logs = [logOf({ id: 'long', startedAt: at(9), stoppedAt: new Date(2026, 10, 11, 0, 0) })];
		const free = freeWindowsBetween(busyWindowsOf(logs, bounds), bounds, bounds.end);
		const pieces = placementOf(HOUR, free, at(0));

		expect(pieces).toEqual([{ start: at(8), end: at(9) }]);
	});

	it('splits time across windows and refuses more than the free time', () => {
		const logs = [
			logOf({ id: 'a', startedAt: at(0), stoppedAt: at(9) }),
			logOf({ id: 'b', startedAt: at(10), stoppedAt: at(23) })
		];
		const free = freeWindowsBetween(busyWindowsOf(logs, bounds), bounds, bounds.end);

		expect(freeSecondsOf(free)).toBe(2 * HOUR);
		expect(placementOf(90 * MINUTE, free, at(0))).toEqual([
			{ start: at(9), end: at(10) },
			{ start: at(23), end: at(23, 30) }
		]);
		expect(placementOf(3 * HOUR, free, at(0))).toBeNull();
	});

	it('keeps a running timer and time after now out of reach', () => {
		const logs = [logOf({ id: 'running', startedAt: at(14), isRunning: true })];
		const now = at(16);
		const limit = placementLimitOf(bounds, now, false);
		const free = freeWindowsBetween(busyWindowsOf(logs, bounds), bounds, limit);

		expect(free).toEqual([{ start: at(0), end: at(14) }]);
	});

	it('gives one interval when the time spills before 09:00 inside one free stretch', () => {
		const now = at(11);
		const limit = placementLimitOf(bounds, now, false);
		const free = freeWindowsBetween(busyWindowsOf([], bounds), bounds, limit);
		const pieces = placementOf(4 * HOUR, free, at(0));

		expect(pieces).toEqual([{ start: at(7), end: at(11) }]);
	});

	it('counts an entry that started the day before', () => {
		const logs = [logOf({ id: 'night', startedAt: new Date(2026, 10, 9, 22), stoppedAt: at(2) })];
		const free = freeWindowsBetween(busyWindowsOf(logs, bounds), bounds, bounds.end);

		expect(free[0]).toEqual({ start: at(2), end: bounds.end });
	});
});

describe('singlePlacementOf', () => {
	const bounds = dayBoundsOf(at(0));

	function freeOf(logs: ITimeLog[], limit: Date = bounds.end) {
		return freeWindowsBetween(busyWindowsOf(logs, bounds), bounds, limit);
	}

	it('starts at 09:00 on a free day', () => {
		const interval = singlePlacementOf(90 * MINUTE, freeOf([]), at(0));

		expect(interval).toEqual({ start: at(9), end: at(10, 30) });
	});

	it('skips a free stretch that is too short instead of splitting the time', () => {
		const logs = [logOf({ id: 'standup', startedAt: at(9, 45), stoppedAt: at(10) })];
		const free = freeOf(logs);

		expect(placementOf(90 * MINUTE, free, at(0))).toHaveLength(2);
		expect(singlePlacementOf(90 * MINUTE, free, at(0))).toEqual({ start: at(10), end: at(11, 30) });
	});

	it('takes the stretch across 09:00 before the ones that end earlier', () => {
		const logs = [logOf({ id: 'early', startedAt: at(6), stoppedAt: at(7) })];
		const now = at(10);
		const free = freeOf(logs, placementLimitOf(bounds, now, false));

		expect(singlePlacementOf(90 * MINUTE, free, at(0))).toEqual({ start: at(8, 30), end: at(10) });
	});

	it('ends at 09:00 when the rest of the day is taken', () => {
		const logs = [logOf({ id: 'long', startedAt: at(9), stoppedAt: bounds.end })];

		expect(singlePlacementOf(90 * MINUTE, freeOf(logs), at(0))).toEqual({ start: at(7, 30), end: at(9) });
	});

	it('finds nothing when the free time is enough only in several pieces', () => {
		const logs = [
			logOf({ id: 'a', startedAt: at(0), stoppedAt: at(9) }),
			logOf({ id: 'b', startedAt: at(10), stoppedAt: at(23) })
		];
		const free = freeOf(logs);

		expect(freeSecondsOf(free)).toBe(2 * HOUR);
		expect(singlePlacementOf(90 * MINUTE, free, at(0))).toBeNull();
	});
});

describe('reductionOf', () => {
	const tracked = logOf({ id: 'tracked', startedAt: at(9), stoppedAt: at(10) });
	const manualEarly = logOf({ id: 'early', logType: ETimeLogType.MANUAL, startedAt: at(11), stoppedAt: at(12) });
	const manualLate = logOf({ id: 'late', logType: ETimeLogType.MANUAL, startedAt: at(13), stoppedAt: at(13, 30) });

	it('deletes the latest manual entries first and shortens the next one', () => {
		const plan = reductionOf([tracked, manualEarly, manualLate], 45 * MINUTE);

		expect(plan?.deleteIds).toEqual(['late']);
		expect(plan?.shorten?.log.id).toBe('early');
		expect(plan?.shorten?.stoppedAt).toEqual(at(11, 45));
	});

	it('never cuts tracked time', () => {
		expect(reductionOf([tracked, manualLate], HOUR)).toBeNull();
	});
});

describe('locks', () => {
	const today = dayOf(new Date(2026, 10, 11), '2026-11-11');
	const tomorrow = dayOf(new Date(2026, 10, 12), '2026-11-12');

	it('closes days after today unless the organization allows them', () => {
		expect(cellLockOf(OPEN_RULES, today, undefined)).toBe('none');
		expect(cellLockOf(OPEN_RULES, tomorrow, undefined)).toBe('future');
		expect(cellLockOf({ ...OPEN_RULES, allowsFutureDates: true }, tomorrow, undefined)).toBe('none');
	});

	it('closes approved weeks and running cells', () => {
		const approved = logOf({
			startedAt: at(9),
			stoppedAt: at(10),
			timesheet: {
				id: 'sheet',
				status: ETimesheetStatus.APPROVED,
				startedAt: new Date(2026, 10, 9),
				stoppedAt: new Date(2026, 10, 15)
			} as ITimeLog['timesheet']
		});
		const approvedDays = approvedDayKeysOf([approved]);
		const running = { logs: [logOf({ isRunning: true })], seconds: 0 };

		expect(approvedDays.has('2026-11-11')).toBe(true);
		expect(cellLockOf({ ...OPEN_RULES, approvedDayKeys: approvedDays }, today, undefined)).toBe('approved');
		expect(cellLockOf(OPEN_RULES, today, running)).toBe('running');
	});

	it('puts the sheet-wide reasons first', () => {
		expect(cellLockOf({ ...OPEN_RULES, isFiltered: true }, tomorrow, undefined)).toBe('filtered');
		expect(cellLockOf({ ...OPEN_RULES, canWrite: false }, today, undefined)).toBe('permission');
		expect(cellLockOf({ ...OPEN_RULES, allowsManualTime: false }, today, undefined)).toBe('manualTimeOff');
	});
});

describe('copyFitOf', () => {
	it('keeps the plans their day has room for, each one taking its time from the next', () => {
		const day = dayOf(at(0), '2026-11-10');
		const identity = rowIdentityOfLog(logOf({ id: 'row' }));
		const now = at(12);
		const plans = [
			{ identity, day, seconds: 8 * HOUR },
			{ identity, day, seconds: 3 * HOUR },
			{ identity, day, seconds: 5 * HOUR }
		];

		const fit = copyFitOf(plans, [], now, false);

		expect(fit.fitting).toEqual([plans[0], plans[1]]);
		expect(fit.withoutRoomCount).toBe(1);
	});
});

describe('copyPlanOf', () => {
	it('copies each day of last week onto the same weekday, empty cells only', () => {
		const identity = rowIdentityOfLog(logOf({ projectId: 'project', taskId: 'task' }));
		const monday = dayOf(new Date(2026, 10, 9), '2026-11-09');
		const tuesday = dayOf(new Date(2026, 10, 10), '2026-11-10');
		const previousRows = [
			{
				identity,
				secondsByDayKey: new Map([
					['2026-11-02', 2 * HOUR + 15],
					['2026-11-03', HOUR]
				])
			}
		];
		const filled = new Set([sheetCellKeyOf(identity.key, '2026-11-10')]);

		const plans = copyPlanOf(previousRows, [monday, tuesday], filled);

		expect(plans).toHaveLength(1);
		expect(plans[0].day.key).toBe('2026-11-09');
		expect(plans[0].seconds).toBe(2 * HOUR);
	});
});
