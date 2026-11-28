import {
	formatIntegerToHour,
	formatSecondsAsHoursMinutes,
	formatTimeString,
	parseStringInputToHours,
	secondsToTime
} from './date-and-time';

describe('formatSecondsAsHoursMinutes', () => {
	it('reads the duration as seconds', () => {
		expect(formatSecondsAsHoursMinutes(5400)).toBe('1h 30m');
		expect(formatSecondsAsHoursMinutes(3900)).toBe('1h 05m');
		expect(formatSecondsAsHoursMinutes(360000)).toBe('100h 00m');
	});

	it('reads a numeric string as seconds too', () => {
		expect(formatSecondsAsHoursMinutes('5400')).toBe('1h 30m');
	});

	it('drops the seconds and any fraction left over, without showing a fractional minute', () => {
		expect(formatSecondsAsHoursMinutes(59)).toBe('0h 00m');
		expect(formatSecondsAsHoursMinutes(5399.9)).toBe('1h 29m');
		expect(formatSecondsAsHoursMinutes(3600 + 320)).toBe('1h 05m');
	});

	it('gives 0h 0m for a missing, negative or unreadable duration', () => {
		expect(formatSecondsAsHoursMinutes(0)).toBe('0h 0m');
		expect(formatSecondsAsHoursMinutes(undefined)).toBe('0h 0m');
		expect(formatSecondsAsHoursMinutes(null)).toBe('0h 0m');
		expect(formatSecondsAsHoursMinutes('')).toBe('0h 0m');
		expect(formatSecondsAsHoursMinutes('abc')).toBe('0h 0m');
		expect(formatSecondsAsHoursMinutes(-60)).toBe('0h 0m');
		expect(formatSecondsAsHoursMinutes(Number.NaN)).toBe('0h 0m');
		expect(formatSecondsAsHoursMinutes(Number.POSITIVE_INFINITY)).toBe('0h 0m');
	});
});

describe('formatIntegerToHour', () => {
	it('formats whole hours without minutes', () => {
		expect(formatIntegerToHour(0)).toBe('0h');
		expect(formatIntegerToHour(2)).toBe('2h');
	});

	it('formats fractional hours with zero-padded minutes', () => {
		expect(formatIntegerToHour(1.5)).toBe('1h30m');
		expect(formatIntegerToHour(0.25)).toBe('0h15m');
		expect(formatIntegerToHour(1 + 5 / 60)).toBe('1h05m');
	});

	it('carries minutes that round up to 60 into the hours', () => {
		expect(formatIntegerToHour(7199 / 3600)).toBe('2h');
		expect(formatIntegerToHour(3599 / 3600)).toBe('1h');
		expect(formatTimeString(formatIntegerToHour(7199 / 3600))).toBe('2h');
	});

	it('rounds an exact half-minute up', () => {
		expect(formatIntegerToHour(1 + 30 / 3600)).toBe('1h01m');
		expect(formatIntegerToHour(3630 / 3600)).toBe('1h01m');
	});

	it('drops minutes that round down to 0', () => {
		expect(formatIntegerToHour(1 + 1 / 3600)).toBe('1h');
	});

	it('formats negative durations symmetrically to positive ones', () => {
		expect(formatIntegerToHour(-1.5)).toBe('-1h30m');
		expect(formatIntegerToHour(-0.5)).toBe('-0h30m');
		expect(formatIntegerToHour(-2)).toBe('-2h');
		expect(formatIntegerToHour(-7199 / 3600)).toBe('-2h');
		expect(formatIntegerToHour(-1 / 3600)).toBe('0h');
	});

	it('keeps the magnitude of an exceeded weekly limit (remaining < 0)', () => {
		// The weekly-limit report renders its own '-' and relies on formatTimeString for the magnitude
		expect(formatTimeString(formatIntegerToHour(-5400 / 3600))).toBe('1h 30m');
		expect(formatTimeString(formatIntegerToHour(-1800 / 3600))).toBe('30m');
	});
});

describe('secondsToTime', () => {
	it('splits whole seconds into hours, minutes and seconds', () => {
		expect(secondsToTime(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
		expect(secondsToTime(59)).toEqual({ hours: 0, minutes: 0, seconds: 59 });
		expect(secondsToTime(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
		expect(secondsToTime(360000)).toEqual({ hours: 100, minutes: 0, seconds: 0 });
	});

	it('rounds a part of a second up, as before', () => {
		expect(secondsToTime(10.4)).toEqual({ hours: 0, minutes: 0, seconds: 11 });
		expect(secondsToTime(3600.5)).toEqual({ hours: 1, minutes: 0, seconds: 1 });
	});

	it('carries a part of a second that rounds up to 60 into the minute or the hour', () => {
		expect(secondsToTime(59.2)).toEqual({ hours: 0, minutes: 1, seconds: 0 });
		expect(secondsToTime(3599.2)).toEqual({ hours: 1, minutes: 0, seconds: 0 });
		expect(secondsToTime(7199.9)).toEqual({ hours: 2, minutes: 0, seconds: 0 });
	});
});

describe('parseStringInputToHours', () => {
	it('reads H:MM and decimal inputs', () => {
		expect(parseStringInputToHours('4:30')).toEqual({ hours: 4.5 });
		expect(parseStringInputToHours('100:45')).toEqual({ hours: 100.75 });
		expect(parseStringInputToHours('2,5')).toEqual({ hours: 2.5 });
		expect(parseStringInputToHours(' ')).toEqual({ hours: 0 });
	});

	it('gives the reason of a rejected input as a code, next to its English message', () => {
		expect(parseStringInputToHours('1:75')).toEqual({
			error: 'Minutes must be < 60',
			errorCode: 'MINUTES_OUT_OF_RANGE'
		});
		const invalidFormat = { error: 'Invalid format. Use H:MM or decimal (e.g. 4.5).', errorCode: 'INVALID_FORMAT' };
		expect(parseStringInputToHours('abc')).toEqual(invalidFormat);
		expect(parseStringInputToHours('-1')).toEqual(invalidFormat);
	});
});
