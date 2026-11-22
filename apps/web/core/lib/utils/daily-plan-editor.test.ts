import { oneHourLess, plannedHoursFromInput, plannedHoursText } from './daily-plan-editor';

describe('plannedHoursFromInput (#5713)', () => {
	it.each([
		['2,5', 2.5],
		['2.5', 2.5],
		['2:30', 2.5],
		['100:45', 100.75],
		['8', 8],
		[' 6 ', 6],
		['0', 0],
		['', 0]
	])('reads %p as %p hours', (typed, hours) => {
		expect(plannedHoursFromInput(typed)).toBe(hours);
	});

	it.each([['two'], ['2:75'], ['-1'], ['2;5'], ['1e400']])('cannot read %p', (typed) => {
		expect(plannedHoursFromInput(typed)).toBeNull();
	});
});

describe('plannedHoursText', () => {
	it('shows whole hours as a number, as the field always did', () => {
		expect(plannedHoursText(8)).toBe('8');
		expect(plannedHoursText(0)).toBe('0');
	});

	it('shows a part of an hour as H:MM', () => {
		expect(plannedHoursText(2.5)).toBe('2:30');
		expect(plannedHoursText(0.25)).toBe('0:15');
	});
});

describe('oneHourLess', () => {
	it('never goes below no time', () => {
		expect(oneHourLess(3)).toBe(2);
		expect(oneHourLess(2.5)).toBe(1.5);
		expect(oneHourLess(0.5)).toBe(0);
	});
});
