/** @jest-environment jsdom */
import { clearOwnSignOutMark, leaveOwnSignOutMark, ownSignOutMark, wasStoppedByOwnSignOut } from './own-sign-out-mark';

const MARK_KEY = 'ever-teams.own-sign-out';

describe("the mark of the person's own sign-out (#5721)", () => {
	afterEach(() => {
		window.localStorage.clear();
		jest.restoreAllMocks();
	});

	it('names the timer run the sign-out stopped, for the other tabs of the browser', () => {
		jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);

		leaveOwnSignOutMark('log-1');

		expect(ownSignOutMark()).toEqual({ at: 1_800_000_000_000, stoppedTimeLogId: 'log-1' });
		expect(wasStoppedByOwnSignOut('log-1')).toBe(true);
	});

	it('does not speak for another run, nor for a tab that showed none', () => {
		leaveOwnSignOutMark('log-1');

		expect(wasStoppedByOwnSignOut('log-2')).toBe(false);
		expect(wasStoppedByOwnSignOut(null)).toBe(false);
	});

	it('stops no run when the sign-out stopped none', () => {
		leaveOwnSignOutMark(null);

		expect(ownSignOutMark()?.stoppedTimeLogId).toBeNull();
		expect(wasStoppedByOwnSignOut(null)).toBe(false);
	});

	it('is gone once someone is signed in again', () => {
		leaveOwnSignOutMark('log-1');

		clearOwnSignOutMark();

		expect(ownSignOutMark()).toBeNull();
		expect(wasStoppedByOwnSignOut('log-1')).toBe(false);
	});

	it.each([
		['nothing stored', null],
		['text that is not a mark', 'not json'],
		['a mark without its time', JSON.stringify({ stoppedTimeLogId: 'log-1' })]
	])('reads no mark from %s', (_case, stored) => {
		if (stored !== null) {
			window.localStorage.setItem(MARK_KEY, stored);
		}

		expect(ownSignOutMark()).toBeNull();
	});

	it('keeps the sign-out going when the browser blocks its storage', () => {
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});

		expect(() => leaveOwnSignOutMark('log-1')).not.toThrow();
	});
});
