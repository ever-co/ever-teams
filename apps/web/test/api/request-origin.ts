/**
 * Test-only (never part of the app): the headers a browser puts on a request to a proxy route that takes it only from
 * this app's own pages (`refuseForeignOrigin`), for the tests of those routes. The tests send their requests to
 * `APP_ORIGIN`.
 */

/** Where this app is served in the route tests. */
export const APP_ORIGIN = 'https://app.ever.team';

/** What a browser sends with a request of this app's own pages. */
export const SAME_ORIGIN_HEADERS: Record<string, string> = { origin: APP_ORIGIN, 'sec-fetch-site': 'same-origin' };

/**
 * Requests of other pages than this app's, which the browser still sends with the session's cookies: each is refused
 * with a 403 before the route reads anything.
 */
export const FOREIGN_ORIGIN_HEADERS: ReadonlyArray<[label: string, headers: Record<string, string>]> = [
	['another site', { origin: 'https://evil.example.net', 'sec-fetch-site': 'cross-site' }],
	['a sibling subdomain', { origin: 'https://evil.ever.team', 'sec-fetch-site': 'same-site' }],
	['an Origin alone that is not this host', { origin: 'https://evil.example.net' }]
];
