import {
	isSharedInvoiceLink,
	isSharedInvoicePath,
	paymentReturnUrlOf,
	sharedInvoicePageOfHash,
	sharedInvoicePathOf
} from './shared-invoice';

const ID = '0b6e4c2a-1d3f-4e5a-8b7c-9d0e1f2a3b4c';
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IngifQ.c2lnbmF0dXJl';

describe('shared invoice links', () => {
	it('reads the invoice link of a Gauzy email as the public page of this app', () => {
		expect(sharedInvoicePageOfHash(`#/share/invoices/${ID}/${TOKEN}`)).toBe(`/shared-invoice/${ID}/${TOKEN}`);
		expect(sharedInvoicePageOfHash(`#/share/invoices/${ID}/${TOKEN}/`)).toBe(`/shared-invoice/${ID}/${TOKEN}`);
		expect(sharedInvoicePageOfHash(`#/share/invoices/${ID}/${TOKEN}?x=1`)).toBe(`/shared-invoice/${ID}/${TOKEN}`);
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

	it('names the public page, and tells it apart from other pages', () => {
		expect(sharedInvoicePathOf(ID, TOKEN)).toBe(`/shared-invoice/${ID}/${TOKEN}`);
		expect(isSharedInvoicePath(`/shared-invoice/${ID}/${TOKEN}`)).toBe(true);
		expect(isSharedInvoicePath('/shared-invoices')).toBe(false);
		expect(isSharedInvoicePath('/invoices')).toBe(false);
	});

	it('sends the client back to the page itself, marked as a return', () => {
		expect(paymentReturnUrlOf(`https://app.ever.team/shared-invoice/${ID}/${TOKEN}?paid=1#top`)).toBe(
			`https://app.ever.team/shared-invoice/${ID}/${TOKEN}?paid=1`
		);
	});
});
