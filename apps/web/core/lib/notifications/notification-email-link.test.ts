import { pageOfNotificationEmailLink } from './notification-email-link';

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
