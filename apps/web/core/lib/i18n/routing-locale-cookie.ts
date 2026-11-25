/**
 * The cookie the routing reads to choose the language of a link that names none (`/profile/...`): it follows the
 * language of the last page served. A page that was only prefetched was not opened by anyone, and must not move
 * it: a link prefetched in the previous language put that language back a few clicks after a change (#5735).
 */
export const ROUTING_LOCALE_COOKIE = 'NEXT_LOCALE';

const PREFETCH_HEADERS = ['next-router-prefetch', 'next-router-segment-prefetch'];
const PREFETCH_PURPOSES = ['purpose', 'sec-purpose'];
const SET_COOKIE = 'set-cookie';
// The copy of the cookies the framework hands to the page it renders for this same request
const MIDDLEWARE_SET_COOKIE = 'x-middleware-set-cookie';

/** Whether a request only prepares a page that nobody opened yet. */
export function isPrefetchRequest(headers: Headers): boolean {
	const isRouterPrefetch = PREFETCH_HEADERS.some((name) => headers.has(name));
	if (isRouterPrefetch) {
		return true;
	}
	return PREFETCH_PURPOSES.some((name) => (headers.get(name) ?? '').toLowerCase().includes('prefetch'));
}

function setsRoutingLocale(cookie: string): boolean {
	return cookie.trimStart().startsWith(`${ROUTING_LOCALE_COOKIE}=`);
}

/** Takes the routing language cookie out of what a response sets, and leaves every other cookie as it is. */
export function dropRoutingLocaleCookie(headers: Headers): void {
	const cookies = headers.getSetCookie();
	const kept = cookies.filter((cookie) => !setsRoutingLocale(cookie));
	if (kept.length === cookies.length) {
		return;
	}
	headers.delete(SET_COOKIE);
	for (const cookie of kept) {
		headers.append(SET_COOKIE, cookie);
	}
	if (!headers.has(MIDDLEWARE_SET_COOKIE)) {
		return;
	}
	if (kept.length === 0) {
		headers.delete(MIDDLEWARE_SET_COOKIE);
		return;
	}
	headers.set(MIDDLEWARE_SET_COOKIE, kept.join(','));
}

/** A prefetched page leaves the routing language cookie as the person's last opened page set it. */
export function keepRoutingLocaleOnPrefetch(requestHeaders: Headers, responseHeaders: Headers): void {
	if (!isPrefetchRequest(requestHeaders)) {
		return;
	}
	dropRoutingLocaleCookie(responseHeaders);
}
