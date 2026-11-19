import { createdDayOf } from './created-day';

describe("the line above a task's title", () => {
	it('shows the day the task was created', () => {
		expect(createdDayOf('2026-11-19T10:00:00.000Z', 'en-GB')).toBe('19 Nov 2026');
	});

	it('shows no day the API did not give', () => {
		expect(createdDayOf(undefined)).toBeUndefined();
		expect(createdDayOf('not a date')).toBeUndefined();
	});
});
