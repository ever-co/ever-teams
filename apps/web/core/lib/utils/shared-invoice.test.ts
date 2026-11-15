import {
	isPaymentReturnUrl,
	isSharedInvoiceAddress,
	isSharedInvoiceLink,
	paymentReturnUrlOf,
	sharedInvoiceFragmentOf,
	sharedInvoiceLinkOf,
	sharedInvoicePageOfHash
} from './shared-invoice';

const ID = '0b6e4c2a-1d3f-4e5a-8b7c-9d0e1f2a3b4c';
const TOKEN = 'test-header.test-payload.test-signature';
const PAGE = `/shared-invoice#id=${ID}&token=${TOKEN}`;

describe('shared invoice links', () => {
	it('reads the invoice link of a Gauzy email as the public page of this app', () => {
		expect(sharedInvoicePageOfHash(`#/share/invoices/${ID}/${TOKEN}`)).toBe(PAGE);
		expect(sharedInvoicePageOfHash(`#/share/invoices/${ID}/${TOKEN}/`)).toBe(PAGE);
		expect(sharedInvoicePageOfHash(`#/share/invoices/${ID}/${TOKEN}?x=1`)).toBe(PAGE);
	});

	it('keeps the token in the fragment, out of the path any server or log receives', () => {
		const page = new URL(sharedInvoicePageOfHash(`#/share/invoices/${ID}/${TOKEN}`) ?? '', 'https://app.test');

		expect(page.pathname).toBe('/shared-invoice');
		// proxy.ts's matcher skips a path with a dot (`.*\..*`), which would leave the page without its locale: a 404
		expect(page.pathname).not.toContain('.');
		expect(page.pathname).not.toContain(TOKEN);
		expect(sharedInvoiceLinkOf(page.hash)).toEqual({ id: ID, token: TOKEN });
	});

	it.each([
		['another route', '#/pages/inbox'],
		['an anchor', '#top'],
		['no token', `#/share/invoices/${ID}`],
		['an id that is not one', `#/share/invoices/../../settings/${TOKEN}`],
		['a token that is not one', `#/share/invoices/${ID}/<script>`],
		['more segments', `#/share/invoices/${ID}/${TOKEN}/edit`]
	])('ignores %s', (_label, hash) => {
		expect(sharedInvoicePageOfHash(hash)).toBeNull();
	});

	it('only takes an invoice id and a signed token', () => {
		expect(isSharedInvoiceLink(ID, TOKEN)).toBe(true);
		expect(isSharedInvoiceLink('42', TOKEN)).toBe(false);
		expect(isSharedInvoiceLink(ID, 'abc')).toBe(false);
		expect(isSharedInvoiceLink(undefined, TOKEN)).toBe(false);
	});

	it("reads the link from the public page's fragment, and nothing that cannot be one", () => {
		expect(sharedInvoiceLinkOf(sharedInvoiceFragmentOf(ID, TOKEN))).toEqual({ id: ID, token: TOKEN });
		expect(sharedInvoiceLinkOf('')).toBeNull();
		expect(sharedInvoiceLinkOf(`#token=${TOKEN}`)).toBeNull();
		expect(sharedInvoiceLinkOf(`#id=42&token=${TOKEN}`)).toBeNull();
		expect(sharedInvoiceLinkOf(`#id=${ID}&token=abc`)).toBeNull();
	});

	it.each([
		['the public page', '/shared-invoice', `#id=${ID}&token=${TOKEN}`],
		['the public page in another language', '/fr/shared-invoice', ''],
		['an email link landing on the home page', '/', `#/share/invoices/${ID}/${TOKEN}`],
		['an email link landing on a sign-in page', '/auth/passcode', `#/share/invoices/${ID}/${TOKEN}`]
	])('knows %s carries the token', (_label, pathname, hash) => {
		expect(isSharedInvoiceAddress(pathname, hash)).toBe(true);
	});

	it.each([
		['the home page', '/', ''],
		['an invoice of the app', '/invoices/x', ''],
		['a notification link', '/', '#/pages/inbox'],
		['a page whose name only starts the same', '/shared-invoices', '']
	])('knows %s carries none', (_label, pathname, hash) => {
		expect(isSharedInvoiceAddress(pathname, hash)).toBe(false);
	});

	it('sends the client back to the page itself, marked as a return, without the link', () => {
		const back = paymentReturnUrlOf(`https://app.ever.team/fr/shared-invoice?x=1#id=${ID}&token=${TOKEN}`);

		expect(back).toBe('https://app.ever.team/fr/shared-invoice?paid=1');
		expect(back).not.toContain(TOKEN);
	});

	it('takes as return address the public page only, on the origin that asked', () => {
		const origin = 'https://app.ever.team';

		expect(isPaymentReturnUrl(`${origin}/shared-invoice?paid=1`, origin)).toBe(true);
		expect(isPaymentReturnUrl(`${origin}/fr/shared-invoice?paid=1`, origin)).toBe(true);
		expect(isPaymentReturnUrl(`${origin}/shared-invoice?paid=1`, null)).toBe(true);
		expect(isPaymentReturnUrl('https://evil.example/shared-invoice?paid=1', origin)).toBe(false);
		expect(isPaymentReturnUrl(`${origin}/auth/passcode`, origin)).toBe(false);
		expect(isPaymentReturnUrl(`${origin}/shared-invoices`, origin)).toBe(false);
		expect(isPaymentReturnUrl('https://user:pass@app.ever.team/shared-invoice', null)).toBe(false);
		expect(isPaymentReturnUrl('javascript:alert(1)//shared-invoice', null)).toBe(false);
		expect(isPaymentReturnUrl('/shared-invoice', null)).toBe(false);
		expect(isPaymentReturnUrl(undefined, origin)).toBe(false);
	});
});
