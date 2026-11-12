/**
 * @jest-environment <rootDir>/test/environments/jsdom-west-of-utc.ts
 *
 * In New York, where the clock changes twice a year, so these cases fail if a day is counted by its clock alone.
 * A UTC host (CI) has no such day, and a test file cannot set `TZ` itself: the environment does.
 */

import { describe, expect, it } from '@jest/globals';
import {
	IDLE_PHASE,
	type IntervalRequest,
	intervalProposalOf,
	restingDurationTextOf,
	type ShownTimes,
	spanSecondsOf
} from './manual-time-entry';

const HOUR = 3600;

// New York enters summer time on 8 March 2026 (02:00 becomes 03:00) and leaves it on 1 November 2026 (02:00 becomes
// 01:00 again)
const SPRING_FORWARD_DAY = new Date(2026, 2, 8);
const FALL_BACK_DAY = new Date(2026, 10, 1);

function timesOf(startMinutes: number, endMinutes: number): ShownTimes {
	return { startMinutes, endMinutes };
}

function offsetAt(day: Date, hours: number) {
	const moment = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours);
	return moment.getTimezoneOffset();
}

describe('the time from a start to an end on a day the clock changes', () => {
	it('runs in a zone whose clock does change on these days', () => {
		expect(offsetAt(SPRING_FORWARD_DAY, 0)).toBe(5 * 60);
		expect(offsetAt(SPRING_FORWARD_DAY, 12)).toBe(4 * 60);
		expect(offsetAt(FALL_BACK_DAY, 0)).toBe(4 * 60);
		expect(offsetAt(FALL_BACK_DAY, 12)).toBe(5 * 60);
	});

	it('leaves out the hour the clock skips', () => {
		// 01:30 to 03:30 lasts one hour: there is no 02:00 to 03:00 that night
		const acrossTheChange = timesOf(90, 210);

		expect(spanSecondsOf(acrossTheChange, SPRING_FORWARD_DAY)).toBe(HOUR);
		expect(restingDurationTextOf(IDLE_PHASE, acrossTheChange, SPRING_FORWARD_DAY)).toBe('1h 0m');
	});

	it('counts the hour the clock repeats', () => {
		// 00:30 to 02:30 lasts three hours: 01:00 to 02:00 comes twice that night
		const acrossTheChange = timesOf(30, 150);

		expect(spanSecondsOf(acrossTheChange, FALL_BACK_DAY)).toBe(3 * HOUR);
		expect(restingDurationTextOf(IDLE_PHASE, acrossTheChange, FALL_BACK_DAY)).toBe('3h 0m');
	});

	it('counts the clock alone away from the change, and while no day is picked', () => {
		const afternoon = timesOf(840, 930);

		expect(spanSecondsOf(afternoon, SPRING_FORWARD_DAY)).toBe(1.5 * HOUR);
		expect(spanSecondsOf(timesOf(90, 210), null)).toBe(2 * HOUR);
	});
});

describe('the interval proposed on the day the clock goes back', () => {
	// That night 01:00 to 02:00 comes twice. A form writes a time as an hour and a minute, and reads 01:30 back as the
	// first of the two: an interval that starts or ends in the second one would be saved an hour off
	const EIGHT_IN_THE_MORNING = new Date(2026, 10, 1, 8);
	const MILLISECONDS_PER_HOUR = HOUR * 1000;

	// The day is read at 08:00 and the organization refuses time in the future: the free time is 00:00 to 08:00
	function requestOf(seconds: number): IntervalRequest {
		const now = EIGHT_IN_THE_MORNING;
		return { seconds, day: FALL_BACK_DAY, memberLogs: [], claimed: [], now, allowsFutureDates: false };
	}

	it('proposes nothing that would start in the hour the form cannot write', () => {
		// 6h 30m up to 08:00 starts at the second 01:30, which a form reads back as the first, an hour earlier
		const wouldStart = new Date(EIGHT_IN_THE_MORNING.getTime() - 6.5 * MILLISECONDS_PER_HOUR);
		const readBack = new Date(2026, 10, 1, wouldStart.getHours(), wouldStart.getMinutes());
		expect(wouldStart.getTime() - readBack.getTime()).toBe(MILLISECONDS_PER_HOUR);

		const proposal = intervalProposalOf(requestOf(6.5 * HOUR));

		expect(proposal).toEqual({ status: 'noRoom' });
	});

	it('still proposes an interval whose start and end come once, also across the repeated hour', () => {
		const sixHours = intervalProposalOf(requestOf(6 * HOUR));
		const eightHours = intervalProposalOf(requestOf(8 * HOUR));

		const twoInTheMorning = new Date(2026, 10, 1, 2);
		const firstOneInTheMorning = new Date(2026, 10, 1, 1);
		expect(sixHours).toEqual({ status: 'ready', interval: { start: twoInTheMorning, end: EIGHT_IN_THE_MORNING } });
		expect(eightHours).toEqual({
			status: 'ready',
			interval: { start: firstOneInTheMorning, end: EIGHT_IN_THE_MORNING }
		});
	});
});
