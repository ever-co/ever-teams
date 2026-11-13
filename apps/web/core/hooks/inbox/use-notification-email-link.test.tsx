/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { useNotificationEmailLink } from './use-notification-email-link';

const replace = jest.fn();
let pathname: string | null = '/';

jest.mock('next/navigation', () => ({
	usePathname: () => pathname,
	useRouter: () => ({ replace })
}));

/** The fragment a link lands with, set as a browser sets it before the app starts. */
function landWith(hash: string) {
	window.history.replaceState(null, '', `/${hash}`);
}

describe('useNotificationEmailLink', () => {
	beforeEach(() => {
		replace.mockClear();
		pathname = '/';
		landWith('');
	});

	it('opens the entry a notification e-mail links to', () => {
		landWith('#/pages/inbox?item=item-1');

		renderHook(() => useNotificationEmailLink());

		expect(replace).toHaveBeenCalledTimes(1);
		expect(replace).toHaveBeenCalledWith('/inbox?item=item-1');
	});

	it('opens the notification settings from the home page of another language', () => {
		pathname = '/fr';
		landWith('#/pages/settings/notifications');

		renderHook(() => useNotificationEmailLink());

		expect(replace).toHaveBeenCalledWith('/settings/personal/notifications');
	});

	it.each([
		['no fragment', ''],
		['an anchor of a page', '#notifications'],
		['another route of the Gauzy app', '#/pages/dashboard']
	])('goes nowhere with %s', (_case, hash) => {
		landWith(hash);

		renderHook(() => useNotificationEmailLink());

		expect(replace).not.toHaveBeenCalled();
	});

	it.each([['/auth/passcode'], ['/fr/auth/passcode'], ['/auth/password']])(
		'does not open the page from the sign-in page %s',
		(signInPage) => {
			pathname = signInPage;
			landWith('#/pages/inbox?item=item-1');

			renderHook(() => useNotificationEmailLink());

			expect(replace).not.toHaveBeenCalled();
		}
	);

	it('opens a link pasted in a tab that is already on the app', () => {
		renderHook(() => useNotificationEmailLink());
		expect(replace).not.toHaveBeenCalled();

		act(() => {
			landWith('#/pages/inbox?item=item-2');
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});

		expect(replace).toHaveBeenCalledWith('/inbox?item=item-2');
	});

	it('stops listening once the app is left', () => {
		const { unmount } = renderHook(() => useNotificationEmailLink());
		unmount();

		act(() => {
			landWith('#/pages/inbox?item=item-3');
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});

		expect(replace).not.toHaveBeenCalled();
	});
});
