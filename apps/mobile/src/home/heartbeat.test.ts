import { slotSeconds } from './heartbeat';

describe('a heartbeat', () => {
	const at = Date.UTC(2026, 10, 18, 9, 0, 0);

	it('credits the seconds since the previous one', () => {
		expect(slotSeconds(at, at + 61_400)).toBe(61);
	});

	it('credits one interval when it is the first of the run', () => {
		expect(slotSeconds(null, at)).toBe(60);
	});

	it('never credits more than a 10-minute slot holds, nor less than nothing', () => {
		expect(slotSeconds(at, at + 30 * 60_000)).toBe(600);
		expect(slotSeconds(at, at - 5_000)).toBe(0);
	});
});
