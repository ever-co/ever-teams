import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	creatableSpotAt,
	DRAG_STEP_MINUTES,
	dayKeysOfWindow,
	type DragRules,
	dragRefusalOf,
	edgeScrollStepOf,
	edgesOnDay,
	gridMinuteAt,
	isSameWindow,
	logsWithMovedWindows,
	movedWindowOf,
	nearestSpanIndexOf,
	overlapsAnyWindow,
	rangeOnDay,
	rangeWithin,
	resizedWindowOf,
	selectionRangeOf,
	snappedMinuteOf,
	timeAtGridMinute,
	windowOfRange
} from './calendar-drag';
import { addTimeRangeBetween } from './calendar-view';

const STEP = DRAG_STEP_MINUTES;
const HOUR_HEIGHT = 48;
const MILLISECONDS_PER_HOUR = 3_600_000;

const TUESDAY = new Date(2026, 10, 10);

function at(hours: number, minutes = 0, day = 10) {
	return new Date(2026, 10, day, hours, minutes);
}

function minuteAt(hours: number, minutes = 0) {
	return hours * 60 + minutes;
}

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log',
		duration: 0,
		version: '1',
		logType: ETimeLogType.MANUAL,
		employeeId: 'member',
		...overrides
	};
}

function rulesOf(overrides: Partial<DragRules>): DragRules {
	return {
		memberLogs: [],
		approvedDayKeys: new Set(),
		allowsFutureDates: false,
		now: at(12, 0, 12),
		...overrides
	};
}

describe('pixels to minutes', () => {
	it('reads a height as minutes from midnight', () => {
		expect(gridMinuteAt(10 * HOUR_HEIGHT, HOUR_HEIGHT)).toBe(600);
		expect(gridMinuteAt(10.5 * HOUR_HEIGHT, HOUR_HEIGHT)).toBe(630);
	});

	it('stays inside the day when the pointer leaves the column', () => {
		expect(gridMinuteAt(-40, HOUR_HEIGHT)).toBe(0);
		expect(gridMinuteAt(30 * HOUR_HEIGHT, HOUR_HEIGHT)).toBe(1440);
	});

	it('snaps to the nearest step', () => {
		expect(snappedMinuteOf(607, STEP)).toBe(600);
		expect(snappedMinuteOf(608, STEP)).toBe(615);
		expect(snappedMinuteOf(1439, STEP)).toBe(1440);
		expect(snappedMinuteOf(-20, STEP)).toBe(0);
	});

	it('turns a grid minute into a moment of the day, the last one being the next midnight', () => {
		expect(timeAtGridMinute(TUESDAY, 630)).toEqual(at(10, 30));
		expect(timeAtGridMinute(at(15, 20), 630)).toEqual(at(10, 30));
		expect(timeAtGridMinute(TUESDAY, 1440)).toEqual(at(0, 0, 11));
	});

	it('finds the column under the pointer, or the nearest one', () => {
		const spans = [
			{ left: 56, right: 156 },
			{ left: 156, right: 256 },
			{ left: 256, right: 356 }
		];
		expect(nearestSpanIndexOf(60, spans)).toBe(0);
		expect(nearestSpanIndexOf(200, spans)).toBe(1);
		expect(nearestSpanIndexOf(10, spans)).toBe(0);
		expect(nearestSpanIndexOf(900, spans)).toBe(2);
	});

	it('finds the column in a right-to-left grid, where the first day is on the right', () => {
		const spans = [
			{ left: 256, right: 356 },
			{ left: 156, right: 256 },
			{ left: 56, right: 156 }
		];
		expect(nearestSpanIndexOf(300, spans)).toBe(0);
		expect(nearestSpanIndexOf(60, spans)).toBe(2);
	});

	it('scrolls the grid only near its top and bottom edges', () => {
		expect(edgeScrollStepOf(110, 100, 600)).toBeLessThan(0);
		expect(edgeScrollStepOf(590, 100, 600)).toBeGreaterThan(0);
		expect(edgeScrollStepOf(300, 100, 600)).toBe(0);
	});
});

describe('selectionRangeOf', () => {
	it('selects 10:00 to 11:30 for a drag from 10:00 to 11:30', () => {
		const range = selectionRangeOf(minuteAt(10), minuteAt(11, 30), STEP);
		expect(range).toEqual({ startMinute: 600, endMinute: 690 });
		expect(windowOfRange(TUESDAY, range)).toEqual({ start: at(10), end: at(11, 30) });
	});

	it('keeps the whole step under the press and follows the pointer to the nearest step', () => {
		expect(selectionRangeOf(minuteAt(10, 4), minuteAt(11, 26), STEP)).toEqual({ startMinute: 600, endMinute: 690 });
	});

	it('selects upward from the step the press ends', () => {
		expect(selectionRangeOf(minuteAt(11, 20), minuteAt(10, 2), STEP)).toEqual({ startMinute: 600, endMinute: 690 });
	});

	it('is never shorter than one step', () => {
		expect(selectionRangeOf(minuteAt(10, 2), minuteAt(10, 3), STEP)).toEqual({ startMinute: 600, endMinute: 615 });
		expect(selectionRangeOf(minuteAt(10, 3), minuteAt(10, 2), STEP)).toEqual({ startMinute: 600, endMinute: 615 });
	});

	it('stops at the ends of the day', () => {
		expect(selectionRangeOf(minuteAt(23, 50), 1440, STEP)).toEqual({ startMinute: 1425, endMinute: 1440 });
		expect(selectionRangeOf(minuteAt(0, 10), 0, STEP)).toEqual({ startMinute: 0, endMinute: 15 });
	});
});

describe('rangeWithin', () => {
	it('stops a selection at the entries around it', () => {
		const range = { startMinute: 600, endMinute: 780 };
		const freeTime = { startMinute: 547, endMinute: 720 };
		expect(rangeWithin(range, freeTime)).toEqual({ startMinute: 600, endMinute: 720 });
	});

	it('is null when nothing is left', () => {
		const range = { startMinute: 600, endMinute: 660 };
		expect(rangeWithin(range, { startMinute: 660, endMinute: 720 })).toBeNull();
	});
});

describe('rangeOnDay', () => {
	it('gives the part of an entry crossing midnight on each of its days', () => {
		const window = { start: at(22), end: at(1, 30, 11) };
		expect(rangeOnDay(window, TUESDAY)).toEqual({ startMinute: 1320, endMinute: 1440 });
		expect(rangeOnDay(window, at(0, 0, 11))).toEqual({ startMinute: 0, endMinute: 90 });
		expect(rangeOnDay(window, at(0, 0, 12))).toBeNull();
	});

	it('leaves an entry ending at midnight off the next day', () => {
		const window = { start: at(22), end: at(0, 0, 11) };
		expect(rangeOnDay(window, at(0, 0, 11))).toBeNull();
	});
});

describe('edgesOnDay', () => {
	it('gives both edges to an entry inside its day, one ending at midnight included', () => {
		expect(edgesOnDay({ start: at(9), end: at(10) }, TUESDAY)).toEqual({ hasStart: true, hasEnd: true });
		expect(edgesOnDay({ start: at(22), end: at(0, 0, 11) }, TUESDAY)).toEqual({ hasStart: true, hasEnd: true });
	});

	it('gives the start to the first day and the end to the last day of an entry crossing midnight', () => {
		const night = { start: at(22), end: at(1, 30, 11) };
		expect(edgesOnDay(night, TUESDAY)).toEqual({ hasStart: true, hasEnd: false });
		expect(edgesOnDay(night, at(0, 0, 11))).toEqual({ hasStart: false, hasEnd: true });
	});
});

describe('movedWindowOf', () => {
	const window = { start: at(9), end: at(10, 30) };

	it('moves the start and the end by the same amount', () => {
		const moved = movedWindowOf(window, 0, 120, STEP);
		expect(moved).toEqual({ start: at(11), end: at(12, 30) });
	});

	it('moves to another day at the same time', () => {
		const moved = movedWindowOf(window, 2, 0, STEP);
		expect(moved).toEqual({ start: at(9, 0, 12), end: at(10, 30, 12) });
	});

	it('moves back to an earlier day', () => {
		const moved = movedWindowOf(window, -1, -60, STEP);
		expect(moved).toEqual({ start: at(8, 0, 9), end: at(9, 30, 9) });
	});

	it('lands the start on the step and keeps the duration of an entry that sat off the step', () => {
		const offStep = { start: at(9, 7), end: at(10, 2) };
		const moved = movedWindowOf(offStep, 0, 60, STEP);
		expect(moved).toEqual({ start: at(10), end: at(10, 55) });
	});

	it('changes nothing when the drag comes back to where it began', () => {
		const offStep = { start: at(9, 7), end: at(10, 2) };
		expect(movedWindowOf(offStep, 0, 4, STEP)).toBe(offStep);
		expect(movedWindowOf(offStep, 0, -6, STEP)).toBe(offStep);
	});

	it('stops at midnight on both sides for an entry that fits in its day', () => {
		const early = movedWindowOf(window, 0, -900, STEP);
		expect(early).toEqual({ start: at(0), end: at(1, 30) });
		const late = movedWindowOf(window, 0, 1200, STEP);
		expect(late).toEqual({ start: at(22, 30), end: at(0, 0, 11) });
	});

	it('keeps an entry that sat off the step inside its day', () => {
		const offStep = { start: at(9), end: at(9, 50) };
		const late = movedWindowOf(offStep, 0, 1200, STEP);
		expect(late).toEqual({ start: at(23), end: at(23, 50) });
	});

	it('keeps the real duration of an entry crossing midnight', () => {
		const night = { start: at(22), end: at(1, 30, 11) };
		const moved = movedWindowOf(night, 1, 60, STEP);
		expect(moved).toEqual({ start: at(23, 0, 11), end: at(2, 30, 12) });
		const movedDuration = moved.end.getTime() - moved.start.getTime();
		expect(movedDuration).toBe(3.5 * MILLISECONDS_PER_HOUR);
	});

	it('keeps the real duration across a clock change', () => {
		// The night of 28 to 29 March 2026 loses an hour in the zones that follow European summer time, and none
		// elsewhere: the elapsed time is what must not change, in every zone.
		const beforeChange = { start: new Date(2026, 2, 27, 23, 0), end: new Date(2026, 2, 28, 4, 0) };
		const duration = beforeChange.end.getTime() - beforeChange.start.getTime();
		const moved = movedWindowOf(beforeChange, 1, 0, STEP);
		expect(moved.start).toEqual(new Date(2026, 2, 28, 23, 0));
		const movedDuration = moved.end.getTime() - moved.start.getTime();
		expect(movedDuration).toBe(duration);
	});
});

describe('resizedWindowOf', () => {
	const window = { start: at(9), end: at(10, 30) };

	it('changes only the end when the bottom edge is dragged', () => {
		const resized = resizedWindowOf(window, 'end', TUESDAY, minuteAt(12, 4), STEP);
		expect(resized).toEqual({ start: at(9), end: at(12) });
	});

	it('changes only the start when the top edge is dragged', () => {
		const resized = resizedWindowOf(window, 'start', TUESDAY, minuteAt(8, 10), STEP);
		expect(resized).toEqual({ start: at(8, 15), end: at(10, 30) });
	});

	it('keeps one step of time when an edge is dragged past the other', () => {
		const pastEnd = resizedWindowOf(window, 'start', TUESDAY, minuteAt(11), STEP);
		expect(pastEnd).toEqual({ start: at(10, 15), end: at(10, 30) });
		const pastStart = resizedWindowOf(window, 'end', TUESDAY, minuteAt(8), STEP);
		expect(pastStart).toEqual({ start: at(9), end: at(9, 15) });
	});

	it('keeps an edge off the step when it is brought back to the step where it is drawn', () => {
		const offStep = { start: at(9), end: at(10, 37) };
		const resized = resizedWindowOf(offStep, 'end', TUESDAY, minuteAt(10, 32), STEP);
		expect(resized).toEqual(offStep);
	});

	it('stretches the end to midnight at most', () => {
		const resized = resizedWindowOf(window, 'end', TUESDAY, 1440, STEP);
		expect(resized).toEqual({ start: at(9), end: at(0, 0, 11) });
	});

	it('resizes the end of an entry crossing midnight on its last day', () => {
		const night = { start: at(22), end: at(1, 30, 11) };
		const resized = resizedWindowOf(night, 'end', at(0, 0, 11), minuteAt(3), STEP);
		expect(resized).toEqual({ start: at(22), end: at(3, 0, 11) });
	});
});

describe('overlapsAnyWindow', () => {
	const others = [{ start: at(11), end: at(12) }];

	it('accepts a window that only touches another one', () => {
		expect(overlapsAnyWindow({ start: at(10), end: at(11) }, others)).toBe(false);
		expect(overlapsAnyWindow({ start: at(12), end: at(13) }, others)).toBe(false);
	});

	it('refuses a window sharing time with another one', () => {
		expect(overlapsAnyWindow({ start: at(10), end: at(11, 1) }, others)).toBe(true);
		expect(overlapsAnyWindow({ start: at(11, 15), end: at(11, 30) }, others)).toBe(true);
		expect(overlapsAnyWindow({ start: at(10), end: at(13) }, others)).toBe(true);
	});
});

describe('dayKeysOfWindow', () => {
	it('lists every day a window covers, a window ending at midnight staying on its day', () => {
		expect(dayKeysOfWindow({ start: at(9), end: at(10) })).toEqual(['2026-11-10']);
		expect(dayKeysOfWindow({ start: at(22), end: at(0, 0, 11) })).toEqual(['2026-11-10']);
		expect(dayKeysOfWindow({ start: at(22), end: at(1, 0, 11) })).toEqual(['2026-11-10', '2026-11-11']);
	});
});

describe('dragRefusalOf', () => {
	const previous = { start: at(9), end: at(10) };
	const dragged = logOf({ id: 'dragged', startedAt: at(9), stoppedAt: at(10) });
	const tracked = logOf({
		id: 'tracked',
		logType: ETimeLogType.TRACKED,
		startedAt: at(13),
		stoppedAt: at(14)
	});
	const rules = rulesOf({ memberLogs: [dragged, tracked] });

	it('accepts free time, the entry not counting against itself', () => {
		const next = { start: at(9, 30), end: at(10, 30) };
		expect(dragRefusalOf('dragged', previous, next, rules)).toBe('none');
	});

	it('accepts a place that only touches another entry', () => {
		const next = { start: at(12), end: at(13) };
		expect(dragRefusalOf('dragged', previous, next, rules)).toBe('none');
	});

	it('refuses a place that overlaps another entry', () => {
		const next = { start: at(12, 30), end: at(13, 30) };
		expect(dragRefusalOf('dragged', previous, next, rules)).toBe('overlap');
	});

	it('refuses a resize that reaches into another entry', () => {
		const next = { start: at(9), end: at(13, 15) };
		expect(dragRefusalOf('dragged', previous, next, rules)).toBe('overlap');
	});

	it('refuses the time a running timer still holds', () => {
		const running = logOf({ id: 'running', logType: ETimeLogType.TRACKED, startedAt: at(15), isRunning: true });
		const withTimer = rulesOf({ memberLogs: [dragged, running] });
		const next = { start: at(18), end: at(19) };
		expect(dragRefusalOf('dragged', previous, next, withTimer)).toBe('overlap');
	});

	it('refuses an end after now when the organization refuses future time', () => {
		const today = rulesOf({ memberLogs: [dragged], now: at(12, 0, 10) });
		const next = { start: at(11, 30), end: at(12, 30) };
		expect(dragRefusalOf('dragged', previous, next, today)).toBe('future');
		const tomorrow = { start: at(9, 0, 11), end: at(10, 0, 11) };
		expect(dragRefusalOf('dragged', previous, tomorrow, today)).toBe('future');
	});

	it('accepts time after now when the organization allows it', () => {
		const today = rulesOf({ memberLogs: [dragged], now: at(12, 0, 10), allowsFutureDates: true });
		const tomorrow = { start: at(9, 0, 11), end: at(10, 0, 11) };
		expect(dragRefusalOf('dragged', previous, tomorrow, today)).toBe('none');
	});

	it('refuses to take time out of an approved day or to bring time into one', () => {
		const next = { start: at(9, 0, 11), end: at(10, 0, 11) };
		const approvedOrigin = rulesOf({ memberLogs: [dragged], approvedDayKeys: new Set(['2026-11-10']) });
		expect(dragRefusalOf('dragged', previous, next, approvedOrigin)).toBe('approved');
		const approvedTarget = rulesOf({ memberLogs: [dragged], approvedDayKeys: new Set(['2026-11-11']) });
		expect(dragRefusalOf('dragged', previous, next, approvedTarget)).toBe('approved');
	});
});

describe('creatableSpotAt', () => {
	const morning = logOf({ id: 'morning', startedAt: at(9), stoppedAt: at(10, 7) });
	const afternoon = logOf({ id: 'afternoon', startedAt: at(14), stoppedAt: at(15) });
	const rules = rulesOf({ memberLogs: [morning, afternoon] });

	it('gives the free time between the entries around the spot', () => {
		const spot = creatableSpotAt(at(11), rules);
		expect(spot.refusal).toBe('none');
		expect(spot.window).toEqual({ start: at(10, 7), end: at(14) });
	});

	it('refuses a spot inside an entry', () => {
		expect(creatableSpotAt(at(9, 30), rules)).toEqual({ refusal: 'overlap', window: null });
	});

	it('refuses an approved day', () => {
		const approved = rulesOf({ approvedDayKeys: new Set(['2026-11-10']) });
		expect(creatableSpotAt(at(11), approved)).toEqual({ refusal: 'approved', window: null });
	});

	it('stops at now, and refuses what comes after, when the organization refuses future time', () => {
		const today = rulesOf({ now: at(12, 0, 10) });
		const spot = creatableSpotAt(at(11), today);
		expect(spot.window).toEqual({ start: at(0), end: at(12) });
		expect(creatableSpotAt(at(12, 30), today).refusal).toBe('future');
		expect(creatableSpotAt(at(9, 0, 11), today).refusal).toBe('future');
	});

	it('opens the days ahead when the organization allows future time', () => {
		const today = rulesOf({ now: at(12, 0, 10), allowsFutureDates: true });
		const spot = creatableSpotAt(at(9, 0, 11), today);
		expect(spot.refusal).toBe('none');
		expect(spot.window).toEqual({ start: at(0, 0, 11), end: at(0, 0, 12) });
	});
});

describe('logsWithMovedWindows', () => {
	const first = logOf({ id: 'first', startedAt: at(9), stoppedAt: at(10) });
	const second = logOf({ id: 'second', startedAt: at(11), stoppedAt: at(12) });
	const logs = [first, second];

	it('answers the same list when nothing is being saved', () => {
		expect(logsWithMovedWindows(logs, new Map())).toBe(logs);
	});

	it('draws only the saved entry at its new place', () => {
		const window = { start: at(15), end: at(16) };
		const moved = logsWithMovedWindows(logs, new Map([['second', window]]));
		expect(moved[0]).toBe(first);
		expect(moved[1]).toEqual({ ...second, startedAt: at(15), stoppedAt: at(16) });
		expect(second.startedAt).toEqual(at(11));
	});
});

describe('isSameWindow', () => {
	it('compares both ends', () => {
		const window = { start: at(9), end: at(10) };
		expect(isSameWindow(window, { start: at(9), end: at(10) })).toBe(true);
		expect(isSameWindow(window, { start: at(9), end: at(10, 15) })).toBe(false);
	});
});

describe('addTimeRangeBetween', () => {
	it('opens Add time on the dragged range', () => {
		expect(addTimeRangeBetween(at(10), at(11, 30))).toEqual({ start: at(10), end: at(11, 30) });
	});

	it('ends a range dragged to midnight at 23:59, since the dialog holds one date', () => {
		expect(addTimeRangeBetween(at(22), at(0, 0, 11))).toEqual({ start: at(22), end: at(23, 59) });
	});
});
