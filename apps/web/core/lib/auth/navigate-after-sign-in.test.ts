/** @jest-environment jsdom */

import { navigateAfterSignIn } from './navigate-after-sign-in';

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
