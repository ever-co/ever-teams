/** @jest-environment jsdom */
import { setRoutingLocaleCookie } from './index';

describe('the routing language cookie written at a language change', () => {
	afterEach(() => {
		document.cookie = 'NEXT_LOCALE=; Max-Age=0; path=/';
	});

	it('holds the language just picked, for the whole site', () => {
		document.cookie = 'NEXT_LOCALE=de; path=/';

		setRoutingLocaleCookie('fr');

		expect(document.cookie).toContain('NEXT_LOCALE=fr');
		expect(document.cookie).not.toContain('NEXT_LOCALE=de');
	});
});
