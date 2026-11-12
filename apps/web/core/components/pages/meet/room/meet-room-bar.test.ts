import { elapsedLabelOf } from './meet-room-bar';

describe('elapsedLabelOf', () => {
	it('counts minutes and seconds, then hours past the first hour', () => {
		expect(elapsedLabelOf(0)).toBe('00:00');
		expect(elapsedLabelOf(65_400)).toBe('01:05');
		expect(elapsedLabelOf(3_725_000)).toBe('1:02:05');
		// A clock that runs a little behind the join time never shows a negative time
		expect(elapsedLabelOf(-500)).toBe('00:00');
	});
});
