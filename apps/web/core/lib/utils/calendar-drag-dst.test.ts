/**
 * @jest-environment <rootDir>/test/environments/jsdom-west-of-utc.ts
 *
 * In New York, where 1 November 2026 lasts 25 hours, so these cases fail if the grid's last minute is counted as 24
 * hours after midnight. A UTC host (CI) has no such day, and a test file cannot set `TZ` itself: the environment does.
 */

import { describe, expect, it } from '@jest/globals';
import { resizedWindowOf, timeAtGridMinute } from './calendar-drag';

const STEP = 15;

const MILLISECONDS_PER_HOUR = 3_600_000;

// New York leaves summer time on 1 November 2026: 02:00 becomes 01:00 again, and the day lasts 25 hours
const FALL_BACK_DAY = new Date(2026, 10, 1);
const NEXT_MIDNIGHT = new Date(2026, 10, 2);

function hoursBetween(start: Date, end: Date) {
	return (end.getTime() - start.getTime()) / MILLISECONDS_PER_HOUR;
}

describe('the Calendar grid on a day the clock goes back', () => {
	it('runs in a zone where that day lasts 25 hours', () => {
		expect(hoursBetween(FALL_BACK_DAY, NEXT_MIDNIGHT)).toBe(25);
	});

	it('takes the bottom of the column for the next midnight, not for 23:00', () => {
		expect(timeAtGridMinute(FALL_BACK_DAY, 1440)).toEqual(NEXT_MIDNIGHT);
	});

	it("keeps an entry's real end when its bottom edge is left at the bottom of the column", () => {
		// The column holds 24 of the day's 25 hours: an entry ending at 23:30 is drawn down to its bottom
		const lateEntry = { start: new Date(2026, 10, 1, 22), end: new Date(2026, 10, 1, 23, 30) };

		const resized = resizedWindowOf(lateEntry, 'end', FALL_BACK_DAY, 1440, STEP);

		expect(resized).toEqual(lateEntry);
	});

	it('stretches an end dragged to the bottom of the column to the next midnight', () => {
		const evening = { start: new Date(2026, 10, 1, 18), end: new Date(2026, 10, 1, 19) };

		const resized = resizedWindowOf(evening, 'end', FALL_BACK_DAY, 1440, STEP);

		expect(resized).toEqual({ start: evening.start, end: NEXT_MIDNIGHT });
	});
});
