/**
 * The public page of an invoice: the page its email links to, where the client reads the invoice without an account,
 * downloads it as a PDF and pays it online when the workspace connected a payment provider (ever-co/ever-gauzy#11856).
 *
 * Gauzy builds the link with the routes of the Gauzy web app (`<base>/#/share/invoices/<id>/<token>`), the same link
 * its payment reminders carry. Where the base is this app, the route arrives in the fragment, which no server sees:
 * {@link sharedInvoicePageOfHash} names the page of this app it means.
 */

/** The page of an invoice read through its link, in this app. */
export const SHARED_INVOICE_PAGE = '/shared-invoice';

/** What the public read of an invoice joins: who sent it, to whom, and its lines. */
export const SHARED_INVOICE_RELATIONS = 'fromOrganization,organization,toContact,invoiceItems';

const INVOICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A share link's token is a signed token of three base64url parts. */
const LINK_TOKEN = /^[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{1,2048}$/;

const GAUZY_SHARED_INVOICE_ROUTE = '/share/invoices/';

/** Whether an id and a token can be an invoice's share link at all: anything else is refused without a request. */
export function isSharedInvoiceLink(id: unknown, token: unknown): id is string {
	return typeof id === 'string' && typeof token === 'string' && INVOICE_ID.test(id) && LINK_TOKEN.test(token);
}

/** The path of an invoice's public page in this app. */
export function sharedInvoicePathOf(id: string, token: string): string {
	return `${SHARED_INVOICE_PAGE}/${encodeURIComponent(id)}/${encodeURIComponent(token)}`;
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
	return sharedInvoicePathOf(id, token);
}

/** Whether a page path (without its locale prefix) is an invoice's public page. */
export function isSharedInvoicePath(path: string): boolean {
	return path === SHARED_INVOICE_PAGE || path.startsWith(`${SHARED_INVOICE_PAGE}/`);
}

/** The query a provider adds to the page it sends the client back to, once they paid or gave up. */
export const PAID_RETURN_QUERY = 'paid';

/**
 * The page the payment provider sends the client back to: this public page, marked as a return, so the page says the
 * payment is being confirmed until the provider's notification lands.
 */
export function paymentReturnUrlOf(pageUrl: string): string {
	const url = new URL(pageUrl);
	url.hash = '';
	url.search = '';
	url.searchParams.set(PAID_RETURN_QUERY, '1');
	return url.toString();
}
