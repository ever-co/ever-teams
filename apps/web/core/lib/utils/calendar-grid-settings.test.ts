import { describe, expect, it } from '@jest/globals';
import type { CalendarDay, CalendarEntry } from './calendar-view';
import {
	calendarGridSettingsOf,
	DEFAULT_CALENDAR_GRID_SETTINGS,
	gridHeightOf,
	gridHourLabelsOf,
	gridMinuteAtOffset,
	gridOffsetOfMinute,
	gridWindowOf,
	hourHeightOf
} from './calendar-grid-settings';

const DAY = new Date(2026, 10, 9);

function at(hour: number, minute = 0) {
	return new Date(2026, 10, 9, hour, minute);
}

function entryOf(start: Date, end: Date): CalendarEntry {
	return { id: `${start.getTime()}`, start, end } as unknown as CalendarEntry;
}

function dayWith(entries: CalendarEntry[]): CalendarDay {
	return { key: '2026-11-09', date: DAY, entries } as unknown as CalendarDay;
}

describe('calendarGridSettingsOf', () => {
	it('gives the defaults for nothing stored or a value that is not settings', () => {
		expect(calendarGridSettingsOf(undefined)).toEqual(DEFAULT_CALENDAR_GRID_SETTINGS);
		expect(calendarGridSettingsOf('tall')).toEqual(DEFAULT_CALENDAR_GRID_SETTINGS);
		expect(calendarGridSettingsOf(null)).toEqual(DEFAULT_CALENDAR_GRID_SETTINGS);
	});

	it('keeps a valid stored choice', () => {
		const stored = { snapMinutes: 5, firstHour: 7, lastHour: 19, rowHeight: 'tall' };

		expect(calendarGridSettingsOf(stored)).toEqual(stored);
	});

	it('replaces each value it cannot use by its default, alone', () => {
		const stored = { snapMinutes: 7, firstHour: 7, lastHour: 19, rowHeight: 'huge' };

		expect(calendarGridSettingsOf(stored)).toEqual({
			snapMinutes: DEFAULT_CALENDAR_GRID_SETTINGS.snapMinutes,
			firstHour: 7,
			lastHour: 19,
			rowHeight: DEFAULT_CALENDAR_GRID_SETTINGS.rowHeight
		});
	});

	it('shows the whole day when the stored hours do not make a range', () => {
		const backwards = calendarGridSettingsOf({ snapMinutes: 15, firstHour: 19, lastHour: 7, rowHeight: 'default' });
		const outside = calendarGridSettingsOf({ snapMinutes: 15, firstHour: -2, lastHour: 30, rowHeight: 'default' });
		const halfHour = calendarGridSettingsOf({
			snapMinutes: 15,
			firstHour: 7.5,
			lastHour: 19,
			rowHeight: 'default'
		});

		for (const settings of [backwards, outside, halfHour]) {
			expect(settings.firstHour).toBe(0);
			expect(settings.lastHour).toBe(24);
		}
	});
});

describe('hourHeightOf', () => {
	it('keeps 48 px per hour by default, less in compact rows and more in tall ones', () => {
		expect(hourHeightOf('default')).toBe(48);
		expect(hourHeightOf('compact')).toBeLessThan(48);
		expect(hourHeightOf('tall')).toBeGreaterThan(48);
	});
});

describe('gridWindowOf', () => {
	const sevenToSeven = { ...DEFAULT_CALENDAR_GRID_SETTINGS, firstHour: 7, lastHour: 19 };

	it('is the whole day by default', () => {
		expect(gridWindowOf([dayWith([])], DEFAULT_CALENDAR_GRID_SETTINGS)).toEqual({
			firstMinute: 0,
			lastMinute: 1440
		});
	});

	it('is the chosen hours when every entry fits in them', () => {
		const days = [dayWith([entryOf(at(9), at(13))])];

		expect(gridWindowOf(days, sevenToSeven)).toEqual({ firstMinute: 7 * 60, lastMinute: 19 * 60 });
	});

	it('widens to the whole hours of an entry that starts before or ends after them, so no entry is hidden', () => {
		const early = entryOf(at(6, 30), at(7, 30));
		const late = entryOf(at(18), at(19, 10));

		expect(gridWindowOf([dayWith([early, late])], sevenToSeven)).toEqual({
			firstMinute: 6 * 60,
			lastMinute: 20 * 60
		});
	});
});

describe('gridHourLabelsOf', () => {
	it('labels the inner hour lines only, for the whole day', () => {
		const labels = gridHourLabelsOf({ firstMinute: 0, lastMinute: 1440 });

		expect(labels.map((label) => label.hour)).toEqual(Array.from({ length: 23 }, (_, index) => index + 1));
		expect(labels.every((label) => label.edge === 'inside')).toBe(true);
	});

	it('also names the first and the last hour of a shorter window, at its edges', () => {
		const labels = gridHourLabelsOf({ firstMinute: 7 * 60, lastMinute: 19 * 60 });

		expect(labels[0]).toEqual({ hour: 7, edge: 'top' });
		expect(labels.at(-1)).toEqual({ hour: 19, edge: 'bottom' });
		expect(labels).toHaveLength(13);
	});
});

describe('grid geometry', () => {
	const window = { firstMinute: 7 * 60, lastMinute: 19 * 60 };

	it('places a minute from the top of the window, at the row height', () => {
		expect(gridOffsetOfMinute(7 * 60, window, 48)).toBe(0);
		expect(gridOffsetOfMinute(9 * 60 + 30, window, 48)).toBe(120);
		expect(gridOffsetOfMinute(9 * 60 + 30, window, 72)).toBe(180);
	});

	it('reads a pointer offset back as a minute of the day', () => {
		expect(gridMinuteAtOffset(120, window, 48)).toBe(9 * 60 + 30);
		expect(gridMinuteAtOffset(-10, window, 48)).toBe(7 * 60);
	});

	it('is as tall as the window', () => {
		expect(gridHeightOf(window, 48)).toBe(12 * 48);
		expect(gridHeightOf({ firstMinute: 0, lastMinute: 1440 }, 48)).toBe(24 * 48);
	});
});
