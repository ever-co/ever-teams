/** @jest-environment jsdom */

import {
	KEPT_PAGE_TTL_MS,
	keepNotificationEmailPage,
	pageOfNotificationEmailLink,
	takeNotificationEmailPage
} from './notification-email-link';

describe('the page kept for a sign-in', () => {
	const KEY = 'ever-teams:notification-email-page';
	const NOW = Date.UTC(2026, 10, 13, 9, 0);

	beforeEach(() => window.sessionStorage.clear());

	it.each([['/inbox?item=5b0e6a2c-9d1f-4c63-8a47-2f3e1d0c9b8a'], ['/inbox'], ['/settings/personal/notifications']])(
		'gives %s back once',
		(page) => {
			keepNotificationEmailPage(page, NOW);

			expect(takeNotificationEmailPage(NOW + 60_000)).toBe(page);
			expect(takeNotificationEmailPage(NOW + 60_000)).toBeNull();
		}
	);

	it('gives the latest page kept', () => {
		keepNotificationEmailPage('/inbox', NOW);
		keepNotificationEmailPage('/settings/personal/notifications', NOW + 1_000);

		expect(takeNotificationEmailPage(NOW + 2_000)).toBe('/settings/personal/notifications');
	});

	it('forgets a page kept too long ago, or dated after now', () => {
		keepNotificationEmailPage('/inbox', NOW);
		expect(takeNotificationEmailPage(NOW + KEPT_PAGE_TTL_MS + 1)).toBeNull();

		keepNotificationEmailPage('/inbox', NOW);
		expect(takeNotificationEmailPage(NOW - 1)).toBeNull();
	});

	it('gives nothing when nothing was kept', () => {
		expect(takeNotificationEmailPage(NOW)).toBeNull();
	});

	// The storage is the tab's own, but what it holds is read back as a page to open: only a linked page is one.
	it.each([
		['another page of the app', JSON.stringify({ page: '/settings/team', keptAt: NOW })],
		['an address', JSON.stringify({ page: 'https://other.example/inbox', keptAt: NOW })],
		['an address without its scheme', JSON.stringify({ page: '//other.example/inbox', keptAt: NOW })],
		['an entry page with more in its query', JSON.stringify({ page: '/inbox?item=item-1&tab=done', keptAt: NOW })],
		['a page that is not a text', JSON.stringify({ page: { href: '/inbox' }, keptAt: NOW })],
		['a page without its date', JSON.stringify({ page: '/inbox' })],
		['something that is not JSON', '/inbox'],
		['the JSON of nothing', 'null']
	])('gives nothing for %s, and removes it', (_case, stored) => {
		window.sessionStorage.setItem(KEY, stored);

		expect(takeNotificationEmailPage(NOW)).toBeNull();
		expect(window.sessionStorage.getItem(KEY)).toBeNull();
	});
});

describe('pageOfNotificationEmailLink', () => {
	it('opens the entry a notification e-mail links to', () => {
		expect(pageOfNotificationEmailLink('#/pages/inbox?item=5b0e6a2c-9d1f-4c63-8a47-2f3e1d0c9b8a')).toBe(
			'/inbox?item=5b0e6a2c-9d1f-4c63-8a47-2f3e1d0c9b8a'
		);
	});

	it('opens the Inbox for the digest link, which names no entry', () => {
		expect(pageOfNotificationEmailLink('#/pages/inbox')).toBe('/inbox');
	});

	it('opens the notification settings', () => {
		expect(pageOfNotificationEmailLink('#/pages/settings/notifications')).toBe('/settings/personal/notifications');
	});

	it('reads a route written with a closing slash', () => {
		expect(pageOfNotificationEmailLink('#/pages/inbox/?item=item-1')).toBe('/inbox?item=item-1');
		expect(pageOfNotificationEmailLink('#/pages/settings/notifications/')).toBe('/settings/personal/notifications');
	});

	it('takes the entry and nothing else from the link', () => {
		expect(
			pageOfNotificationEmailLink('#/pages/inbox?tab=done&item=item-1&source=github&next=//other.example')
		).toBe('/inbox?item=item-1');
	});

	it.each([
		['an empty id', '#/pages/inbox?item='],
		['a path in place of the id', '#/pages/inbox?item=../../settings/team'],
		['an address in place of the id', '#/pages/inbox?item=https://other.example/'],
		['an encoded address in place of the id', `#/pages/inbox?item=${encodeURIComponent('//other.example')}`],
		['a query in place of the id', `#/pages/inbox?item=${encodeURIComponent('1&tab=done')}`],
		['an id longer than an id is', `#/pages/inbox?item=${'a'.repeat(65)}`]
	])('opens the Inbox, without an entry, for %s', (_case, hash) => {
		expect(pageOfNotificationEmailLink(hash)).toBe('/inbox');
	});

	it.each([
		['no fragment', ''],
		['a bare hash', '#'],
		['an anchor of a page', '#notifications'],
		['another route of the Gauzy app', '#/pages/dashboard'],
		['a route below the Inbox', '#/pages/inbox/archive'],
		['a route below the notification settings', '#/pages/settings/notifications/email'],
		['a sign-in route of the Gauzy app', '#/auth/reset-password?token=abc'],
		['a route that only starts like the Inbox', '#/pages/inboxes'],
		['an address in place of the route', '#//other.example/pages/inbox'],
		['a route without its leading slash', '#pages/inbox'],
		['a route in another case', '#/Pages/Inbox']
	])('leaves %s alone', (_case, hash) => {
		expect(pageOfNotificationEmailLink(hash)).toBeNull();
	});
});
