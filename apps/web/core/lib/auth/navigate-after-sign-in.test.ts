/** @jest-environment jsdom */

import { navigateAfterSignIn, setPathAfterSignIn } from './navigate-after-sign-in';

const originalLocation = window.location;

afterAll(() => {
	Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('navigateAfterSignIn', () => {
	it('opens the app with a full page load, so the stale prefetch of / is never replayed', () => {
		const assign = jest.fn();
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...originalLocation, pathname: '/auth/password', assign }
		});

		navigateAfterSignIn();

		expect(assign).toHaveBeenCalledTimes(1);
		expect(assign).toHaveBeenCalledWith('/');
	});

	it('replaces the sign-in page in the history when asked, so Back does not reopen it', () => {
		const assign = jest.fn();
		const replace = jest.fn();
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...originalLocation, pathname: '/auth/passcode', assign, replace }
		});

		navigateAfterSignIn({ replace: true });

		expect(replace).toHaveBeenCalledTimes(1);
		expect(replace).toHaveBeenCalledWith('/');
		expect(assign).not.toHaveBeenCalled();
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

	it('opens the home page for anything that is not a page of this app', () => {
		expect(signInWith('https://evil.example.com/')).toHaveBeenCalledWith('/');
		expect(signInWith('//evil.example.com/')).toHaveBeenCalledWith('/');
		expect(signInWith('/\\evil.example.com/')).toHaveBeenCalledWith('/');
	});
});
