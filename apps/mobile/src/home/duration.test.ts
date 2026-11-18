import { clockOf, hoursAndMinutes, liveSeconds } from './duration';

describe('a duration', () => {
	it('reads as hours and whole minutes', () => {
		expect(hoursAndMinutes(6740)).toEqual({ hours: 1, minutes: 52 });
		expect(hoursAndMinutes(59)).toEqual({ hours: 0, minutes: 0 });
	});

	it("shows as the timer's digits", () => {
		expect(clockOf(6740)).toBe('01:52:20');
		expect(clockOf(0)).toBe('00:00:00');
		expect(clockOf(360000)).toBe('100:00:00');
	});

	it('never shows less than nothing', () => {
		expect(clockOf(-5)).toBe('00:00:00');
		expect(hoursAndMinutes(-5)).toEqual({ hours: 0, minutes: 0 });
	});
});

describe('a total counted by the API', () => {
	const countedAt = Date.UTC(2026, 10, 18, 8, 0, 0);

	it('grows with the seconds since its answer while the timer runs', () => {
		expect(liveSeconds(6740, countedAt, countedAt + 65_400, true)).toBe(6805);
	});

	it('stays as the API said while the timer is stopped', () => {
		expect(liveSeconds(6740, countedAt, countedAt + 65_400, false)).toBe(6740);
	});

	it("adds nothing when the phone's clock is set back before the answer", () => {
		expect(liveSeconds(6740, countedAt, countedAt - 30_000, true)).toBe(6740);
	});
});
