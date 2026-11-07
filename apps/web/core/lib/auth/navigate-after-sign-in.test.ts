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
});
