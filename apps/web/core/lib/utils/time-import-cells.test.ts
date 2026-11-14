import {
	calendarDayOf,
	cellDayOf,
	cellMomentOf,
	clockTimeOf,
	dateOrdersOf,
	datePartOf,
	durationSecondsOf,
	holdsDateAndTime,
	yesNoOf
} from './time-import-cells';

const HOUR = 3600;
const MINUTE = 60;

const NOV_3 = { year: 2026, month: 11, day: 3 };

describe('cellMomentOf', () => {
	it('reads a time alone, without a day of its own', () => {
		expect(cellMomentOf('9:30 AM')).toEqual({ day: null, clock: { hours: 9, minutes: 30, seconds: 0 } });
	});

	it.each([
		['2026-11-03 09:30', 'yearFirst'],
		['2026-11-03T09:30:00', 'yearFirst'],
		['03/11/2026 9:30 AM', 'dayFirst'],
		['11/03/2026, 9:30 AM', 'monthFirst']
	] as const)('reads %s as a date and a time', (text, order) => {
		expect(cellMomentOf(text, order)).toEqual({ day: NOV_3, clock: { hours: 9, minutes: 30, seconds: 0 } });
	});

	it.each([
		['a date without a time', '2026-11-03', 'yearFirst'],
		['a date with words', '2026-11-03 noon', 'yearFirst'],
		['a date the order cannot read', '13/11/2026 09:00', 'monthFirst'],
		['a time zone after the time', '2026-11-03T09:30:00Z', 'yearFirst']
	] as const)('refuses %s', (_name, text, order) => {
		expect(cellMomentOf(text, order)).toBeNull();
	});
});

describe('cellDayOf', () => {
	it('reads a date alone, or the date of a cell that also holds a time', () => {
		expect(cellDayOf('2026-11-03')).toEqual(NOV_3);
		expect(cellDayOf('03/11/2026 17:45', 'dayFirst')).toEqual(NOV_3);
		expect(cellDayOf('17:45')).toBeNull();
	});
});

describe('datePartOf', () => {
	it('keeps the date of a cell that also holds a time, and the cell itself otherwise', () => {
		expect(datePartOf(' 03/11/2026 9:30 AM ')).toBe('03/11/2026');
		expect(datePartOf('03/11/2026')).toBe('03/11/2026');
		expect(datePartOf('9:30 AM')).toBe('9:30 AM');
	});
});

describe('holdsDateAndTime', () => {
	it.each([
		['2026-11-03 09:30', true],
		['13/11/2026 9:30 PM', true],
		['09:30', false],
		['2026-11-03', false],
		['Fix login 09:30', false]
	])('tells whether %s holds a date and a time', (text, expected) => {
		expect(holdsDateAndTime(text)).toBe(expected);
	});
});

describe('calendarDayOf in the order of a file', () => {
	it('reads 03/11/2026 as 3 November day first and as 11 March month first', () => {
		expect(calendarDayOf('03/11/2026', 'dayFirst')).toEqual({ year: 2026, month: 11, day: 3 });
		expect(calendarDayOf('03/11/2026', 'monthFirst')).toEqual({ year: 2026, month: 3, day: 11 });
	});

	it.each([
		['3/11/2026', { year: 2026, month: 11, day: 3 }],
		['03-11-2026', { year: 2026, month: 11, day: 3 }],
		['03.11.2026', { year: 2026, month: 11, day: 3 }],
		[' 29/02/2024 ', { year: 2024, month: 2, day: 29 }]
	])('reads %s day first', (text, expected) => {
		expect(calendarDayOf(text, 'dayFirst')).toEqual(expected);
	});

	it.each([
		['a day that does not exist', '31/02/2026', 'dayFirst'],
		['a month above 12', '13/11/2026', 'monthFirst'],
		['a year first date', '2026-11-03', 'dayFirst'],
		['a year on two digits', '03/11/26', 'dayFirst'],
		['two different separators', '03/11-2026', 'monthFirst']
	] as const)('refuses %s', (_name, text, order) => {
		expect(calendarDayOf(text, order)).toBeNull();
	});
});

describe('dateOrdersOf', () => {
	it.each([
		['a year first', '2026-11-03', ['yearFirst']],
		['a day above 12', '13/11/2026', ['dayFirst']],
		['a second number above 12', '11/13/2026', ['monthFirst']],
		['numbers that both fit a month', '03/11/2026', ['dayFirst', 'monthFirst']],
		['a day that exists in no order', '31/02/2026', []],
		['a time', '09:30', []]
	])('reads %s in the orders that make it a real day', (_name, text, expected) => {
		expect(dateOrdersOf(text)).toEqual(expected);
	});
});

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

	it.each(['01:30:00', '1:30', '1.5', '90m'])('reads %s as an hour and a half', (text) => {
		expect(durationSecondsOf(text)).toBe(HOUR + 30 * MINUTE);
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
