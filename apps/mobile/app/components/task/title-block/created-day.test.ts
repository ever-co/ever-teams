import { createdDayOf } from './created-day';

describe("the line above a task's title", () => {
	it('shows the day the task was created', () => {
		// a local noon: the same calendar day in every time zone the tests run in
		expect(createdDayOf(new Date(2026, 10, 19, 12).toISOString(), 'en-GB')).toBe('19 Nov 2026');
	});

	it('shows no day the API did not give', () => {
		expect(createdDayOf(undefined)).toBeUndefined();
		expect(createdDayOf('not a date')).toBeUndefined();
	});
});
