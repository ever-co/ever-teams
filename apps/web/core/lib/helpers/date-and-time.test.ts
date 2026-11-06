import { formatIntegerToHour, formatTimeString, parseStringInputToHours } from './date-and-time';

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

describe('parseStringInputToHours', () => {
	it('reads H:MM and decimal inputs', () => {
		expect(parseStringInputToHours('4:30')).toEqual({ hours: 4.5 });
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
