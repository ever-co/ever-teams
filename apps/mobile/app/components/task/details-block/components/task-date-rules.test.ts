import moment from 'moment-timezone';
import {
	acceptsDayFor,
	calendarDayOf,
	dayOfStoredDate,
	presetDayOf,
	shortDayOf,
	storedDateOf
} from './task-date-rules';

const wednesday = new Date(2026, 10, 18, 15, 30);
const saturday = new Date(2026, 10, 21, 9, 0);

describe("a task date's rules", () => {
	it('names the days of the presets as the web does, from today', () => {
		expect(calendarDayOf(presetDayOf('today', wednesday))).toBe('2026-11-18');
		expect(calendarDayOf(presetDayOf('tomorrow', wednesday))).toBe('2026-11-19');
		expect(calendarDayOf(presetDayOf('endOfWeek', wednesday))).toBe('2026-11-20');
		expect(calendarDayOf(presetDayOf('inOneWeek', wednesday))).toBe('2026-11-25');
		expect(calendarDayOf(presetDayOf('endOfWeek', saturday))).toBe('2026-11-27');
	});

	it('sends a picked day as the task page always did: its local midnight, in ISO', () => {
		expect(storedDateOf(new Date(2026, 10, 20, 17, 45))).toBe(moment('2026-11-20').toISOString());
	});

	it('reads a stored date as its day on the phone, and nothing for none', () => {
		expect(calendarDayOf(dayOfStoredDate(moment('2026-11-20').toISOString()) as Date)).toBe('2026-11-20');
		expect(dayOfStoredDate(null)).toBeNull();
		expect(dayOfStoredDate('not a date')).toBeNull();
	});

	it('refuses a start after the due day and a due day before the start, as the web does', () => {
		const dueFriday = moment('2026-11-20').toISOString();
		const startFriday = moment('2026-11-20').toISOString();

		expect(acceptsDayFor('start', new Date(2026, 10, 20), dueFriday)).toBe(true);
		expect(acceptsDayFor('start', new Date(2026, 10, 21), dueFriday)).toBe(false);
		expect(acceptsDayFor('due', new Date(2026, 10, 20), startFriday)).toBe(true);
		expect(acceptsDayFor('due', new Date(2026, 10, 19), startFriday)).toBe(false);
		expect(acceptsDayFor('due', new Date(2026, 10, 19), null)).toBe(true);
	});

	it('reads a day of this year with its weekday, and one of another year with its year', () => {
		expect(shortDayOf(new Date(2026, 10, 20), 'en', wednesday)).toBe(
			new Date(2026, 10, 20).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
		);
		expect(shortDayOf(new Date(2027, 0, 8), 'en', wednesday)).toContain('2027');
	});
});
