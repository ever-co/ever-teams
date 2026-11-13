/** @jest-environment jsdom */

import { navigateAfterSignIn, PATH_AFTER_SIGN_IN_TTL_MS, setPathAfterSignIn } from './navigate-after-sign-in';
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

describe('the page a sign-in opens (#5025)', () => {
	const signIn = ({ replace = false } = {}) => {
		const assign = jest.fn();
		const replaceLocation = jest.fn();
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: {
				...originalLocation,
				origin: 'https://app.ever.team',
				pathname: '/auth/passcode',
				assign,
				replace: replaceLocation
			}
		});
		navigateAfterSignIn({ replace });
		return replace ? replaceLocation : assign;
	};
	const signInWith = (stored: string | null) => {
		setPathAfterSignIn(stored);
		return signIn();
	};

	it('opens the page set for this sign-in, once', () => {
		expect(signInWith('/workspace/new')).toHaveBeenCalledWith('/workspace/new');
		// Read once: the next sign-in of the tab opens the home page
		expect(signIn()).toHaveBeenCalledWith('/');
		expect(signInWith(null)).toHaveBeenCalledWith('/');
	});

	it('replaces the sign-in page with it when asked', () => {
		setPathAfterSignIn('/workspace/new');
		expect(signIn({ replace: true })).toHaveBeenCalledWith('/workspace/new');
	});

	it('forgets a page set for a sign-in that never came: a much later one opens the home page', () => {
		const now = jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 11, 9, 0));
		setPathAfterSignIn('/workspace/new');

		now.mockReturnValue(Date.UTC(2026, 10, 11, 9, 0) + PATH_AFTER_SIGN_IN_TTL_MS + 1);
		expect(signIn()).toHaveBeenCalledWith('/');
		now.mockRestore();
	});

	it('opens the page set for this sign-in before the Board the sign-in started, and keeps neither for later', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`);

		expect(signInWith('/workspace/new')).toHaveBeenCalledWith('/workspace/new');
		// Both were taken: the next sign-in of the tab opens the home page
		expect(signIn()).toHaveBeenCalledWith('/');
	});

	it('opens the home page for anything that is not a page of this app', () => {
		expect(signInWith('https://evil.example.com/')).toHaveBeenCalledWith('/');
		expect(signInWith('//evil.example.com/')).toHaveBeenCalledWith('/');
		expect(signInWith('/\\evil.example.com/')).toHaveBeenCalledWith('/');
	});
});
