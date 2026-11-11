/** @jest-environment jsdom */

import { navigateAfterSignIn } from './navigate-after-sign-in';
import { rememberBoardReturn } from './board-return';

const originalLocation = window.location;
const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const BOARD_ADDRESS = 'https://board.ever.team/?live=true&origin=https%3A%2F%2Fdemo.ever.team';

/** The page the sign-in ends on, with its query, and the navigation calls it receives. */
function onPage(pathname: string, search = '') {
	const assign = jest.fn();
	const replace = jest.fn();
	Object.defineProperty(window, 'location', {
		configurable: true,
		value: { ...originalLocation, pathname, search, assign, replace }
	});
	return { assign, replace };
}

beforeEach(() => {
	// The server injects the runtime env in the browser; the tests set its content.
	(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_BOARD_APP_DOMAIN: 'https://board.ever.team' };
	window.sessionStorage.clear();
});

afterAll(() => {
	Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('navigateAfterSignIn', () => {
	it('opens the app with a full page load, so the stale prefetch of / is never replayed', () => {
		const { assign } = onPage('/auth/password');

		navigateAfterSignIn();

		expect(assign).toHaveBeenCalledTimes(1);
		expect(assign).toHaveBeenCalledWith('/');
	});

	it('replaces the sign-in page in the history when asked, so Back does not reopen it', () => {
		const { assign, replace } = onPage('/auth/passcode');

		navigateAfterSignIn({ replace: true });

		expect(replace).toHaveBeenCalledTimes(1);
		expect(replace).toHaveBeenCalledWith('/');
		expect(assign).not.toHaveBeenCalled();
	});

	it('goes back to the Board when the Board started the sign-in, on another auth page', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`);
		const { assign } = onPage('/auth/workspace');

		navigateAfterSignIn();

		expect(assign).toHaveBeenCalledWith(BOARD_ADDRESS);
	});

	it('goes back to the Board named on the sign-in page, replacing it in the history when asked', () => {
		const { assign, replace } = onPage('/auth/passcode', `?redirect=${encodeURIComponent(BOARD_ADDRESS)}`);

		navigateAfterSignIn({ replace: true });

		expect(replace).toHaveBeenCalledWith(BOARD_ADDRESS);
		expect(assign).not.toHaveBeenCalled();
	});

	it('goes back to the Board once: a later sign-in in the same tab opens the app', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`);
		onPage('/auth/passcode');
		navigateAfterSignIn();

		const { assign } = onPage('/auth/passcode');
		navigateAfterSignIn();

		expect(assign).toHaveBeenCalledWith('/');
	});

	it.each([
		'https://evil.example/',
		'//evil.example',
		'javascript:alert(1)',
		'https://board.ever.team@evil.example/'
	])('opens the app, never %s', (address) => {
		const { assign } = onPage('/auth/passcode', `?redirect=${encodeURIComponent(address)}`);

		navigateAfterSignIn();

		expect(assign).toHaveBeenCalledWith('/');
	});
});
