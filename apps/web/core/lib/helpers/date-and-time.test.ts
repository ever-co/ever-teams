import { formatIntegerToHour, formatTimeString } from './date-and-time';

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

	it('drops minutes that round down to 0', () => {
		expect(formatIntegerToHour(1 + 1 / 3600)).toBe('1h');
	});
});
