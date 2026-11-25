import {
	asksFreshUserRead,
	forgetProfileSave,
	FRESH_USER_READ_WINDOW_MS,
	noteProfileSaved,
	requestAsksFreshUserRead
} from './fresh-user-read';

const NOON = Date.UTC(2026, 10, 24, 12);

describe('the user read after a profile save', () => {
	beforeEach(forgetProfileSave);

	it('is an ordinary read when no profile was saved', () => {
		expect(asksFreshUserRead(NOON)).toBe(false);
	});

	it('asks for a check made anew right after a save', () => {
		noteProfileSaved(NOON);

		expect(asksFreshUserRead(NOON + 200)).toBe(true);
	});

	it('still asks for one until no server instance can hold the older check', () => {
		noteProfileSaved(NOON);

		expect(asksFreshUserRead(NOON + FRESH_USER_READ_WINDOW_MS - 1)).toBe(true);
		expect(asksFreshUserRead(NOON + FRESH_USER_READ_WINDOW_MS)).toBe(false);
	});

	it('is an ordinary read again for a clock that went back', () => {
		noteProfileSaved(NOON);

		expect(asksFreshUserRead(NOON - 1)).toBe(false);
	});
});

describe('a request to the user read route', () => {
	it('asks for a check made anew with fresh=1', () => {
		expect(requestAsksFreshUserRead('http://localhost:3030/api/user/me?includeEmployee=true&fresh=1')).toBe(true);
	});

	it('is an ordinary read without it, or with another value', () => {
		expect(requestAsksFreshUserRead('http://localhost:3030/api/user/me?includeEmployee=true')).toBe(false);
		expect(requestAsksFreshUserRead('http://localhost:3030/api/user/me?fresh=true')).toBe(false);
	});
});
