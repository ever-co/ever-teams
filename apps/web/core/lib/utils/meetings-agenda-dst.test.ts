/**
 * @jest-environment <rootDir>/test/environments/jsdom-west-of-utc.ts
 *
 * In a zone with daylight saving, so the agenda test fails if its days are counted as 24-hour steps.
 * A UTC host (CI) has no clock change, and a test file cannot set `TZ` itself: the environment does.
 */

import { dayAfter, meetingsOfDay, type ScheduledMeeting } from './meetings';

const HOUR = 60 * 60 * 1000;

function meeting(id: string, start: string, end: string): ScheduledMeeting {
	return { id, title: id, description: null, start: new Date(start), end: new Date(end), link: null };
}

describe('the agenda across a change of the clock', () => {
	it('shows the whole of a day that lasts 25 hours, and steps to the next day at its midnight', () => {
		// New York leaves summer time on 1 November 2026: that day has 25 hours
		const day = new Date('2026-11-01T00:00:00');
		const late = meeting('late', '2026-11-01T23:30:00', '2026-11-01T23:45:00');
		const nextMorning = meeting('next-morning', '2026-11-02T00:15:00', '2026-11-02T00:45:00');

		// The zone does change its offset that day (UTC-4, then UTC-5)...
		expect(day.getTimezoneOffset()).toBe(4 * 60);
		expect(late.start.getTimezoneOffset()).toBe(5 * 60);
		// ...so the late meeting lies past 24 hours from midnight, where a fixed step would end the day
		expect(late.start.getTime()).toBeGreaterThanOrEqual(day.getTime() + 24 * HOUR);

		expect(meetingsOfDay([late, nextMorning], day).map(({ id }) => id)).toEqual(['late']);
		expect(dayAfter(day, 1)).toEqual(new Date('2026-11-02T00:00:00'));
		expect(meetingsOfDay([late, nextMorning], dayAfter(day, 1)).map(({ id }) => id)).toEqual(['next-morning']);
	});
});
