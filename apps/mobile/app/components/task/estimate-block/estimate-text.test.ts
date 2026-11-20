import { estimateTextOf } from './estimate-text';

describe("a task's estimate", () => {
	it('reads in hours and minutes, as the Time section writes durations', () => {
		expect(estimateTextOf(24000)).toBe('6h : 40m');
		expect(estimateTextOf(5400)).toBe('1h : 30m');
	});

	it('shows nothing for a task without an estimate, never a made-up one', () => {
		expect(estimateTextOf(null)).toBeNull();
		expect(estimateTextOf(undefined)).toBeNull();
		expect(estimateTextOf(0)).toBeNull();
	});
});
