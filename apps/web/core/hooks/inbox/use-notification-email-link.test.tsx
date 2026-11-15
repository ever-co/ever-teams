/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { KEPT_PAGE_TTL_MS } from '@/core/lib/notifications/notification-email-link';
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

/** One page shown in the tab, with the hook as the root layout mounts it there. */
function show(page: string, hash = '') {
	pathname = page;
	landWith(hash);
	return renderHook(() => useNotificationEmailLink());
}

describe('useNotificationEmailLink', () => {
	beforeEach(() => {
		replace.mockClear();
		window.sessionStorage.clear();
		pathname = '/';
		landWith('');
	});

	it('opens the entry a notification e-mail links to', () => {
		show('/', '#/pages/inbox?item=item-1');

		expect(replace).toHaveBeenCalledTimes(1);
		expect(replace).toHaveBeenCalledWith('/inbox?item=item-1');
	});

	it('opens the notification settings from the home page of another language', () => {
		show('/fr', '#/pages/settings/notifications');

		expect(replace).toHaveBeenCalledWith('/settings/personal/notifications');
	});

	it.each([
		['no fragment', ''],
		['an anchor of a page', '#notifications'],
		['another route of the Gauzy app', '#/pages/dashboard']
	])('goes nowhere with %s', (_case, hash) => {
		show('/', hash);

		expect(replace).not.toHaveBeenCalled();
	});

	it('opens a link pasted in a tab that is already on the app', () => {
		show('/');
		expect(replace).not.toHaveBeenCalled();

		act(() => {
			landWith('#/pages/inbox?item=item-2');
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});

		expect(replace).toHaveBeenCalledWith('/inbox?item=item-2');
	});

	it('stops listening once the app is left', () => {
		show('/').unmount();

		act(() => {
			landWith('#/pages/inbox?item=item-3');
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});

		expect(replace).not.toHaveBeenCalled();
	});

	describe('signed out', () => {
		it.each([['/auth/passcode'], ['/fr/auth/passcode'], ['/auth/password']])(
			'does not open the page from the sign-in page %s',
			(signInPage) => {
				show(signInPage, '#/pages/inbox?item=item-1');

				expect(replace).not.toHaveBeenCalled();
			}
		);

		it('opens the page when the sign-in ends on the home page', () => {
			show('/auth/passcode', '#/pages/inbox?item=item-1').unmount();

			// A sign-in ends with a full load of the home page, without the fragment
			show('/');

			expect(replace).toHaveBeenCalledTimes(1);
			expect(replace).toHaveBeenCalledWith('/inbox?item=item-1');
		});

		it('opens it after the workspace list too, whose "Continue" clears the page a sign-in was given', () => {
			show('/fr/auth/passcode', '#/pages/settings/notifications').unmount();
			setPathAfterSignIn(null);

			show('/fr');

			expect(replace).toHaveBeenCalledWith('/settings/personal/notifications');
		});

		it('opens it once: the home page stays the home page afterwards', () => {
			show('/auth/passcode', '#/pages/inbox?item=item-1').unmount();
			show('/').unmount();
			replace.mockClear();

			show('/');

			expect(replace).not.toHaveBeenCalled();
		});

		it('leaves alone a sign-in that ends on another page, and keeps nothing for later', () => {
			show('/auth/passcode', '#/pages/inbox?item=item-1').unmount();

			// "Create a new workspace" ends the sign-in on the creation page
			show('/workspace/new').unmount();
			show('/');

			expect(replace).not.toHaveBeenCalled();
		});

		it('forgets the page of a sign-in that never came', () => {
			const now = jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 13, 9, 0));
			show('/auth/passcode', '#/pages/inbox?item=item-1').unmount();

			now.mockReturnValue(Date.UTC(2026, 10, 13, 9, 0) + KEPT_PAGE_TTL_MS + 1);
			show('/');

			expect(replace).not.toHaveBeenCalled();
			now.mockRestore();
		});

		it('keeps nothing from a sign-in page that another fragment, or none, comes with', () => {
			show('/auth/passcode').unmount();
			show('/auth/passcode', '#/auth/reset-password?token=abc').unmount();

			show('/');

			expect(replace).not.toHaveBeenCalled();
		});
	});
	describe('the invoice link of an email (ever-co/ever-gauzy#11856)', () => {
		const INVOICE_ID = '0b6e4c2a-1d3f-4e5a-8b7c-9d0e1f2a3b4c';
		const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IngifQ.c2lnbmF0dXJl';

		it("opens the invoice's public page from the home page", () => {
			show('/', `#/share/invoices/${INVOICE_ID}/${TOKEN}`);

			expect(replace).toHaveBeenCalledWith(`/shared-invoice/${INVOICE_ID}/${TOKEN}`);
		});

		it('opens it at once from a sign-in page, since the page needs no sign-in', () => {
			show('/auth/passcode', `#/share/invoices/${INVOICE_ID}/${TOKEN}`);

			expect(replace).toHaveBeenCalledWith(`/shared-invoice/${INVOICE_ID}/${TOKEN}`);
			expect(window.sessionStorage.length).toBe(0);
		});

		it('goes nowhere with an invoice link that cannot be one', () => {
			show('/', '#/share/invoices/42/not-a-token');

			expect(replace).not.toHaveBeenCalled();
		});
	});
});
