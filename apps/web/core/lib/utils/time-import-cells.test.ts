import { calendarDayOf, clockTimeOf, durationSecondsOf, yesNoOf } from './time-import-cells';

const HOUR = 3600;
const MINUTE = 60;

describe('calendarDayOf', () => {
	it.each([
		['2026-11-03', { year: 2026, month: 11, day: 3 }],
		['2026/11/03', { year: 2026, month: 11, day: 3 }],
		['2026-1-9', { year: 2026, month: 1, day: 9 }],
		[' 2024-02-29 ', { year: 2024, month: 2, day: 29 }]
	])('reads %s', (text, expected) => {
		expect(calendarDayOf(text)).toEqual(expected);
	});

	it.each([
		['a day that does not exist', '2026-02-30'],
		['a month that does not exist', '2026-13-01'],
		['a day first date, which reads two ways', '03/11/2026'],
		['a month first date', '11-03-2026'],
		['two different separators', '2026-11/03'],
		['a date with a time', '2026-11-03 09:00'],
		['words', 'yesterday'],
		['an empty cell', '']
	])('refuses %s', (_name, text) => {
		expect(calendarDayOf(text)).toBeNull();
	});
});

describe('clockTimeOf', () => {
	it.each([
		['09:30', { hours: 9, minutes: 30, seconds: 0 }],
		['9:30', { hours: 9, minutes: 30, seconds: 0 }],
		['17:05:30', { hours: 17, minutes: 5, seconds: 30 }],
		['00:00', { hours: 0, minutes: 0, seconds: 0 }],
		['23:59', { hours: 23, minutes: 59, seconds: 0 }],
		['9:30 AM', { hours: 9, minutes: 30, seconds: 0 }],
		['5:05pm', { hours: 17, minutes: 5, seconds: 0 }],
		['12:00 AM', { hours: 0, minutes: 0, seconds: 0 }],
		['12:15 PM', { hours: 12, minutes: 15, seconds: 0 }],
		['9:00:00 a.m.', { hours: 9, minutes: 0, seconds: 0 }]
	])('reads %s', (text, expected) => {
		expect(clockTimeOf(text)).toEqual(expected);
	});

	it.each([
		['an hour past 23', '24:00'],
		['minutes past 59', '9:60'],
		['seconds past 59', '9:30:60'],
		['a 24-hour time with PM', '13:00 PM'],
		['hour 0 on a 12-hour clock', '0:30 AM'],
		['a time without minutes', '9'],
		['minutes on one digit', '9:5'],
		['words', 'noon'],
		['an empty cell', '']
	])('refuses %s', (_name, text) => {
		expect(clockTimeOf(text)).toBeNull();
	});
});

describe('durationSecondsOf', () => {
	it.each([
		['1:30', HOUR + 30 * MINUTE],
		['0:45', 45 * MINUTE],
		['01:30:15', HOUR + 30 * MINUTE + 15],
		['1h 30m', HOUR + 30 * MINUTE],
		['1h30m', HOUR + 30 * MINUTE],
		['2h', 2 * HOUR],
		['45m', 45 * MINUTE],
		['2 H 5 M', 2 * HOUR + 5 * MINUTE],
		['1.5', HOUR + 30 * MINUTE],
		['1,5', HOUR + 30 * MINUTE],
		['1.5h', HOUR + 30 * MINUTE],
		['0.25', 15 * MINUTE],
		['0:00', 0]
	])('reads %s', (text, expected) => {
		expect(durationSecondsOf(text)).toBe(expected);
	});

	it('reads a bare number as hours, never as minutes', () => {
		expect(durationSecondsOf('90')).toBe(90 * HOUR);
	});

	it.each([
		['minutes on one digit', '1:5'],
		['minutes past 59', '1:75'],
		['hours without their unit before minutes', '1 30m'],
		['a negative number', '-1'],
		['words', 'an hour'],
		['an empty cell', ''],
		['spaces', '   ']
	])('refuses %s', (_name, text) => {
		expect(durationSecondsOf(text)).toBeNull();
	});
});

describe('yesNoOf', () => {
	it.each(['yes', 'Yes', 'Y', 'true', 'TRUE', '1', ' yes '])('reads %s as yes', (text) => {
		expect(yesNoOf(text)).toBe(true);
	});

	it.each(['no', 'No', 'n', 'false', 'FALSE', '0'])('reads %s as no', (text) => {
		expect(yesNoOf(text)).toBe(false);
	});

	it.each(['maybe', 'oui', '2', ''])('cannot read %s', (text) => {
		expect(yesNoOf(text)).toBeNull();
	});
});
