/** @jest-environment jsdom */

/**
 * The page that ends an Ever ID sign-in begun by a link to the start address opens the page the link named: the
 * return path waits in its cookie, is checked again, and becomes the page the sign-in opens. The cookie is used once.
 */
import { navigateAfterSignIn, setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { keepEverIdStartReturnForSignIn } from './start-return';

const originalLocation = window.location;

function setCookie(value: string) {
	document.cookie = `ever-id-start-return=${value}; Path=/`;
}

function hasCookie(): boolean {
	return document.cookie.split(';').some((part) => part.trim().startsWith('ever-id-start-return='));
}

/** Where the end of the sign-in goes (navigateAfterSignIn, a full page load). */
function pageOpenedAfterSignIn(): string | undefined {
	const assign = jest.fn();
	Object.defineProperty(window, 'location', {
		configurable: true,
		value: { ...originalLocation, origin: 'http://localhost', pathname: '/auth/workspace', search: '', assign }
	});
	try {
		navigateAfterSignIn();
	} finally {
		Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
	}
	return assign.mock.calls[0]?.[0];
}

beforeEach(() => {
	window.sessionStorage.clear();
	document.cookie = 'ever-id-start-return=; Path=/; Max-Age=0';
});

describe('keepEverIdStartReturnForSignIn', () => {
	it('makes the sign-in open the page the link named, with its query and section', () => {
		setCookie(encodeURIComponent('/settings/team?tab=members#invite'));

		keepEverIdStartReturnForSignIn();

		expect(hasCookie()).toBe(false);
		expect(pageOpenedAfterSignIn()).toBe('/settings/team?tab=members#invite');
	});

	it('uses the path once: a later sign-in of the browser opens the home page', () => {
		setCookie(encodeURIComponent('/task/42'));

		keepEverIdStartReturnForSignIn();
		expect(pageOpenedAfterSignIn()).toBe('/task/42');

		keepEverIdStartReturnForSignIn();
		expect(pageOpenedAfterSignIn()).toBe('/');
	});

	it.each([
		['another site', encodeURIComponent('https://evil.example/')],
		['a host-relative address', encodeURIComponent('//evil.example')],
		['a backslash', encodeURIComponent('/\\evil.example')],
		['an encoded tab', encodeURIComponent('/%09/evil.example')],
		['a malformed escape', '%E0%A4%A']
	])('drops %s, and the sign-in opens the home page', (_label, value) => {
		setCookie(value);

		keepEverIdStartReturnForSignIn();

		expect(hasCookie()).toBe(false);
		expect(pageOpenedAfterSignIn()).toBe('/');
	});

	it('undoes what an abandoned start of the tab kept when the next start names no page', () => {
		setCookie(encodeURIComponent('/task/42'));
		keepEverIdStartReturnForSignIn();

		// The person leaves the chooser, then follows a start link that names no page (an empty cookie).
		setCookie('');
		keepEverIdStartReturnForSignIn();

		expect(hasCookie()).toBe(false);
		expect(pageOpenedAfterSignIn()).toBe('/');
	});

	it('replaces what an abandoned start kept with the page the next start names', () => {
		setCookie(encodeURIComponent('/task/42'));
		keepEverIdStartReturnForSignIn();
		setCookie(encodeURIComponent('/kanban'));
		keepEverIdStartReturnForSignIn();

		expect(pageOpenedAfterSignIn()).toBe('/kanban');
	});

	it('leaves a page set for the sign-in another way, even when a start names no page', () => {
		setPathAfterSignIn('/workspace/new');
		setCookie('');

		keepEverIdStartReturnForSignIn();

		expect(pageOpenedAfterSignIn()).toBe('/workspace/new');
	});

	it('changes nothing without the cookie: a page set for the sign-in another way stays', () => {
		window.sessionStorage.setItem(
			'ever-teams:path-after-sign-in',
			JSON.stringify({ path: '/workspace/new', setAt: Date.now() })
		);

		keepEverIdStartReturnForSignIn();

		expect(pageOpenedAfterSignIn()).toBe('/workspace/new');
	});
});
