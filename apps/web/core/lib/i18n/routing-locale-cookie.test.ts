import {
	dropRoutingLocaleCookie,
	isPrefetchRequest,
	keepRoutingLocaleOnPrefetch,
	ROUTING_LOCALE_COOKIE
} from './routing-locale-cookie';

const GERMAN = `${ROUTING_LOCALE_COOKIE}=de; Path=/; SameSite=lax`;
const SESSION = 'auth-token=abc; Path=/; HttpOnly';

function responseSetting(...cookies: string[]): Headers {
	const headers = new Headers();
	for (const cookie of cookies) {
		headers.append('set-cookie', cookie);
	}
	return headers;
}

describe('a prefetch request', () => {
	it.each([
		['next-router-prefetch', '1'],
		['next-router-segment-prefetch', '/_tree'],
		['purpose', 'prefetch'],
		['sec-purpose', 'prefetch;prerender']
	])('is known by its %s header', (name, value) => {
		expect(isPrefetchRequest(new Headers({ [name]: value }))).toBe(true);
	});

	it('is not a page someone opens', () => {
		expect(isPrefetchRequest(new Headers({ accept: 'text/html' }))).toBe(false);
		expect(isPrefetchRequest(new Headers({ rsc: '1' }))).toBe(false);
	});
});

describe('the routing language cookie of a response', () => {
	it('is taken out, and the other cookies stay', () => {
		const headers = responseSetting(SESSION, GERMAN);

		dropRoutingLocaleCookie(headers);

		expect(headers.getSetCookie()).toEqual([SESSION]);
	});

	it('is taken out of the copy handed to the rendered page too', () => {
		const headers = responseSetting(SESSION, GERMAN);
		headers.set('x-middleware-set-cookie', `${SESSION},${GERMAN}`);

		dropRoutingLocaleCookie(headers);

		expect(headers.get('x-middleware-set-cookie')).toBe(SESSION);
	});

	it('leaves a response that sets no language as it is', () => {
		const headers = responseSetting(SESSION);

		dropRoutingLocaleCookie(headers);

		expect(headers.getSetCookie()).toEqual([SESSION]);
	});
});

/**
 * Priya picks French; a link of the page she left was being prefetched in German, and its answer set the routing
 * cookie back to German: Settings then opened in German (#5735).
 */
describe('the language of the routing after a prefetch', () => {
	it('is not moved by a page that was only prefetched', () => {
		const headers = responseSetting(GERMAN);

		keepRoutingLocaleOnPrefetch(new Headers({ 'next-router-prefetch': '1' }), headers);

		expect(headers.getSetCookie()).toEqual([]);
	});

	it('still follows a page the person opens', () => {
		const headers = responseSetting(GERMAN);

		keepRoutingLocaleOnPrefetch(new Headers({ accept: 'text/html' }), headers);

		expect(headers.getSetCookie()).toEqual([GERMAN]);
	});
});
