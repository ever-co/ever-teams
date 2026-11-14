/**
 * The links of Gauzy's notification e-mails, as this app reads them.
 *
 * Gauzy sends the Inbox e-mails (a notification, a timer reminder, the daily digest) from a job, so no request of
 * this app can name the page they link to. It builds each link on the API's client base URL with the routes of the
 * Gauzy web app (`inbox-delivery-rules.ts` in ever-gauzy):
 *
 *   <base>/#/pages/inbox?item=<id>          an entry
 *   <base>/#/pages/inbox                    the Inbox
 *   <base>/#/pages/settings/notifications   the notification settings
 *
 * Where that base URL is this app, such a link opens the home page with the route in the fragment, which nothing
 * here reads: the person lands on the home page instead of the entry. This names the page each route means here.
 */

const GAUZY_INBOX_ROUTE = '/pages/inbox';
const GAUZY_NOTIFICATION_SETTINGS_ROUTE = '/pages/settings/notifications';

const INBOX_PAGE = '/inbox';
const NOTIFICATION_SETTINGS_PAGE = '/settings/personal/notifications';

/** An entry's id as a link may carry it (Gauzy's ids are UUIDs): nothing else of the link goes into the page. */
const ENTRY_ID = /^[\w-]{1,64}$/;

/**
 * The page of this app that a link of a Gauzy notification e-mail means, read from the fragment the link lands with
 * (`location.hash`); null for any other fragment, an ordinary anchor included.
 *
 * Only the entry's id is taken from the link, and only when it reads as an id: a link without one, or with anything
 * else in its place, opens the Inbox.
 */
export function pageOfNotificationEmailLink(hash: string): string | null {
	if (!hash.startsWith('#/')) {
		return null;
	}
	const queryAt = hash.indexOf('?');
	const route = queryAt === -1 ? hash.slice(1) : hash.slice(1, queryAt);
	const path = route.endsWith('/') ? route.slice(0, -1) : route;

	if (path === GAUZY_NOTIFICATION_SETTINGS_ROUTE) {
		return NOTIFICATION_SETTINGS_PAGE;
	}
	if (path !== GAUZY_INBOX_ROUTE) {
		return null;
	}
	const item = queryAt === -1 ? null : new URLSearchParams(hash.slice(queryAt + 1)).get('item');
	if (!item || !ENTRY_ID.test(item)) {
		return INBOX_PAGE;
	}
	return `${INBOX_PAGE}?item=${encodeURIComponent(item)}`;
}

/** The page a link meant, kept for this tab while the person signs in. */
const KEPT_PAGE_KEY = 'ever-teams:notification-email-page';

/** How long a kept page waits for the sign-in: one with an e-mailed code takes a few minutes at most. */
export const KEPT_PAGE_TTL_MS = 15 * 60 * 1000;

const ENTRY_PAGE = /^\/inbox\?item=[\w-]{1,64}$/;

/** One of the pages pageOfNotificationEmailLink names, and nothing else: what is kept is read back from storage. */
function isLinkedPage(page: unknown): page is string {
	return (
		page === INBOX_PAGE ||
		page === NOTIFICATION_SETTINGS_PAGE ||
		(typeof page === 'string' && ENTRY_PAGE.test(page))
	);
}

/**
 * Keeps the page a link means until this tab's sign-in ends. Signed out, the link lands on the sign-in page, and the
 * page it means is behind the sign-in.
 */
export function keepNotificationEmailPage(page: string, now = Date.now()): void {
	try {
		window.sessionStorage.setItem(KEPT_PAGE_KEY, JSON.stringify({ page, keptAt: now }));
	} catch {
		// No storage (a private window): the sign-in ends on the home page
	}
}

/** The page kept for this tab's sign-in, read once: null unless it is one of the linked pages, kept lately. */
export function takeNotificationEmailPage(now = Date.now()): string | null {
	try {
		const stored = window.sessionStorage.getItem(KEPT_PAGE_KEY);
		if (stored === null) {
			return null;
		}
		window.sessionStorage.removeItem(KEPT_PAGE_KEY);
		const { page, keptAt } = JSON.parse(stored) as { page?: unknown; keptAt?: unknown };
		const age = typeof keptAt === 'number' ? now - keptAt : Number.NaN;
		const isRecent = age >= 0 && age <= KEPT_PAGE_TTL_MS;
		return isRecent && isLinkedPage(page) ? page : null;
	} catch {
		return null;
	}
}
