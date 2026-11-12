/**
 * @jest-environment <rootDir>/test/environments/jsdom-west-of-utc.ts
 *
 * In New York, where 1 November 2026 lasts 25 hours: 01:00 to 02:00 runs twice. The Add time dialog keeps a time as
 * an hour and a minute and reads it back as its first run, so a copy placed in the second run would be saved an hour
 * earlier, and shorter. A UTC host (CI) has no such day, and a test file cannot set `TZ` itself: the environment does.
 */

import { describe, expect, it } from '@jest/globals';
import { duplicateIntervalOf } from './time-entry-reuse';

const STEP = 15;
const HOUR = 3600;
const MILLISECONDS_PER_HOUR = 3_600_000;

// After 03:00 on the day the clock goes back: everything since midnight is free
const NOW = new Date(2026, 10, 1, 3, 30);
const FALL_BACK_DAY = new Date(2026, 10, 1);
const NEXT_MIDNIGHT = new Date(2026, 10, 2);

/** The moment the dialog reads back from the clock time this moment shows. */
function readBackOf(moment: Date) {
	return new Date(2026, 10, 1, moment.getHours(), moment.getMinutes());
}

describe('a copy placed on the day the clock goes back', () => {
	it('runs in a zone where that day lasts 25 hours', () => {
		expect((NEXT_MIDNIGHT.getTime() - FALL_BACK_DAY.getTime()) / MILLISECONDS_PER_HOUR).toBe(25);
	});

	it("goes where the dialog saves it as it is, two hours long, never in the repeated hour's second run", () => {
		// At its own time, 00:30, a two-hour copy would end in the second run of 01:30
		const copy = duplicateIntervalOf({
			seconds: 2 * HOUR,
			sourceStart: new Date(2026, 9, 30, 0, 30),
			memberLogs: [],
			now: NOW,
			stepMinutes: STEP
		});

		expect(copy).not.toBeNull();
		if (!copy) {
			return;
		}
		expect(readBackOf(copy.start)).toEqual(copy.start);
		expect(readBackOf(copy.end)).toEqual(copy.end);
		expect((copy.end.getTime() - copy.start.getTime()) / MILLISECONDS_PER_HOUR).toBe(2);
		expect(copy.end.getTime()).toBeLessThanOrEqual(NOW.getTime());
	});
});
