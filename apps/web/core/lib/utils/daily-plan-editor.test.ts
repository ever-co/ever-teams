import {
	isPlannableHours,
	oneHourLess,
	oneHourMore,
	plannedHoursFromInput,
	plannedHoursText
} from './daily-plan-editor';

describe('plannedHoursFromInput (#5713)', () => {
	it.each([
		['2,5', 2.5],
		['2.5', 2.5],
		['2:30', 2.5],
		['23:45', 23.75],
		['24', 24],
		['24:00', 24],
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

	it.each([['24.5'], ['24:01'], ['25'], ['100:45'], ['9999'], ['1e3']])(
		'refuses %p: it is more than a day',
		(typed) => {
			expect(plannedHoursFromInput(typed)).toBeNull();
		}
	);
});

describe('isPlannableHours', () => {
	it('accepts none up to a whole day', () => {
		expect(isPlannableHours(0)).toBe(true);
		expect(isPlannableHours(7.5)).toBe(true);
		expect(isPlannableHours(24)).toBe(true);
	});

	it.each([[-0.5], [24.01], [Number.POSITIVE_INFINITY], [Number.NaN], [undefined]])('refuses %p', (hours) => {
		expect(isPlannableHours(hours)).toBe(false);
	});
});

describe('oneHourMore', () => {
	it('adds an hour, never past a day', () => {
		expect(oneHourMore(3)).toBe(4);
		expect(oneHourMore(0.5)).toBe(1.5);
		expect(oneHourMore(23)).toBe(24);
		expect(oneHourMore(23.5)).toBe(24);
	});

	it('leaves a plan that already holds a day or more as it is', () => {
		expect(oneHourMore(24)).toBe(24);
		expect(oneHourMore(30)).toBe(30);
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
