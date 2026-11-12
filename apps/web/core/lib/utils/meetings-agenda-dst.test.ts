/**
 * @jest-environment <rootDir>/test/environments/jsdom-west-of-utc.ts
 *
 * In a zone with daylight saving, so the agenda test fails if its seven days are counted as 24-hour steps.
 * A UTC host (CI) has no clock change, and a test file cannot set `TZ` itself: the environment does.
 */

import { agendaOf, type ScheduledMeeting } from './meetings';

const HOUR = 60 * 60 * 1000;

describe('agendaOf across a change of the clock', () => {
	it('keeps the whole seventh day when one of the days lasts 25 hours', () => {
		// New York leaves summer time on 1 November 2026, between today (29 October) and the seventh day
		const now = new Date('2026-10-29T12:00:00');
		const today = new Date('2026-10-29T00:00:00');
		const late: ScheduledMeeting = {
			id: 'late',
			title: 'Late call',
			description: null,
			start: new Date('2026-11-04T23:30:00'),
			end: new Date('2026-11-04T23:45:00'),
			link: null
		};

		// The zone does change its offset that week (UTC-4, then UTC-5)...
		expect(today.getTimezoneOffset()).toBe(4 * 60);
		expect(late.start.getTimezoneOffset()).toBe(5 * 60);
		// ...so the meeting lies past seven 24-hour steps from today, where a fixed horizon would stop
		expect(late.start.getTime()).toBeGreaterThanOrEqual(today.getTime() + 7 * 24 * HOUR);

		const agenda = agendaOf([late], now);

		expect(agenda.flatMap(({ meetings }) => meetings.map(({ id }) => id))).toContain('late');
	});
});
