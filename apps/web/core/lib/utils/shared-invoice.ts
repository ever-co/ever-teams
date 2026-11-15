/**
 * The public page of an invoice: the page its email links to, where the client reads the invoice without an account,
 * downloads it as a PDF and pays it online when the workspace connected a payment provider (ever-co/ever-gauzy#11856).
 *
 * Gauzy builds the link with the routes of the Gauzy web app (`<base>/#/share/invoices/<id>/<token>`), the same link
 * its payment reminders carry. Where the base is this app, the route arrives in the fragment, which no server sees:
 * {@link sharedInvoicePageOfHash} names the page of this app it means, `/shared-invoice#id=<id>&token=<token>`. The
 * token stays in the fragment there too, as a shared report's does (shared-report-path.ts): no access log, no
 * server-side error report and no `Referer` holds it. The error and analytics tools that record the whole address a
 * visit starts on stay off on these addresses ({@link isSharedInvoiceAddress}). Kept dependency-free: those tools'
 * start-up code imports it before the app bundle runs.
 */

/** Where an invoice is read through its link, without signing in: `/shared-invoice#id=<id>&token=<token>`. */
const SHARED_INVOICE_PATH = '/shared-invoice';

// An optional two-letter locale segment (every APPLICATION_LANGUAGES_CODE entry is one), then /shared-invoice.
const SHARED_INVOICE_PATH_PATTERN = /^(?:\/[a-z]{2})?\/shared-invoice(?:\/|$)/i;

/** What the public read of an invoice joins: who sent it, to whom, and its lines. */
export const SHARED_INVOICE_RELATIONS = 'fromOrganization,organization,toContact,invoiceItems';

const INVOICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A share link's token is a signed token of three base64url parts. */
const LINK_TOKEN = /^[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{1,2048}$/;

const GAUZY_SHARED_INVOICE_ROUTE = '/share/invoices/';

/** The invoice a link opens, and the token that opens it. */
export interface SharedInvoiceLink {
	id: string;
	token: string;
}

/** Whether an id and a token can be an invoice's share link at all: anything else is refused without a request. */
export function isSharedInvoiceLink(id: unknown, token: unknown): id is string {
	return typeof id === 'string' && typeof token === 'string' && INVOICE_ID.test(id) && LINK_TOKEN.test(token);
}

/** True for `/shared-invoice` and its locale-prefixed form (`/fr/shared-invoice`). */
function isSharedInvoicePath(pathname: string | null | undefined): boolean {
	return !!pathname && SHARED_INVOICE_PATH_PATTERN.test(pathname);
}

/**
 * Whether an address carries the token of an invoice's link: the public page, or any page the invoice link of a Gauzy
 * email lands on (`#/share/invoices/<id>/<token>`) before it is opened.
 */
export function isSharedInvoiceAddress(pathname: string | null | undefined, hash: string | null | undefined): boolean {
	return isSharedInvoicePath(pathname) || (hash ?? '').startsWith(`#${GAUZY_SHARED_INVOICE_ROUTE}`);
}

/** The fragment of an invoice's public page, `#id=<id>&token=<token>`: the one part of an address no server receives. */
export function sharedInvoiceFragmentOf(id: string, token: string): string {
	return `#${new URLSearchParams({ id, token }).toString()}`;
}

/** The link the fragment of the public page carries (`location.hash`); null when it carries none that can be one. */
export function sharedInvoiceLinkOf(hash: string | null | undefined): SharedInvoiceLink | null {
	const fragment = new URLSearchParams((hash ?? '').replace(/^#/, ''));
	const id = (fragment.get('id') ?? '').trim();
	const token = (fragment.get('token') ?? '').trim();
	return isSharedInvoiceLink(id, token) ? { id, token } : null;
}

/**
 * The page of this app that an invoice link of a Gauzy email means, read from the fragment it lands with
 * (`#/share/invoices/<id>/<token>`); null for any other fragment.
 */
export function sharedInvoicePageOfHash(hash: string): string | null {
	if (!hash.startsWith(`#${GAUZY_SHARED_INVOICE_ROUTE}`)) {
		return null;
	}
	const queryAt = hash.indexOf('?');
	const route = queryAt === -1 ? hash.slice(1) : hash.slice(1, queryAt);
	const [id, token, ...rest] = route.slice(GAUZY_SHARED_INVOICE_ROUTE.length).split('/');
	const hasMore = rest.some((part) => part !== '');
	if (hasMore || !isSharedInvoiceLink(id, token)) {
		return null;
	}
	return `${SHARED_INVOICE_PATH}${sharedInvoiceFragmentOf(id, token)}`;
}

/** The query a provider adds to the page it sends the client back to, once they paid or gave up. */
export const PAID_RETURN_QUERY = 'paid';

/**
 * The page the payment provider sends the client back to: this public page, marked as a return, so the page says the
 * payment is being confirmed until the provider's notification lands. It carries no fragment, so the link's token is
 * neither in the provider's records nor in the address the client comes back on: the page keeps it for the tab while
 * the client pays (use-shared-invoice-link.ts).
 */
export function paymentReturnUrlOf(pageUrl: string): string {
	const url = new URL(pageUrl);
	url.hash = '';
	url.search = '';
	url.searchParams.set(PAID_RETURN_QUERY, '1');
	return url.toString();
}

/**
 * Whether a return address a checkout is asked with is the public page of an invoice: an http(s) address of that page,
 * without credentials, on `origin` when it is known (the origin of the page that asked). Any other address would let the
 * provider send the client somewhere else once they paid.
 */
export function isPaymentReturnUrl(returnUrl: unknown, origin?: string | null): returnUrl is string {
	if (typeof returnUrl !== 'string') {
		return false;
	}
	let url: URL;
	try {
		url = new URL(returnUrl);
	} catch {
		return false;
	}
	const isWeb = url.protocol === 'https:' || url.protocol === 'http:';
	const hasCredentials = url.username !== '' || url.password !== '';
	const isOrigin = !origin || url.origin === origin;
	return isWeb && !hasCredentials && isOrigin && isSharedInvoicePath(url.pathname);
}
