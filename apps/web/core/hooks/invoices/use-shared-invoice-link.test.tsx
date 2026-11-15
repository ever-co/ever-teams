/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { keepLinkWhilePaying, useSharedInvoiceLink } from './use-shared-invoice-link';

const ID = '0b6e4c2a-1d3f-4e5a-8b7c-9d0e1f2a3b4c';
const OTHER_ID = '1c7f5d3b-2e4a-4f6b-9c8d-0e1f2a3b4c5d';
const TOKEN = 'test-header.test-payload.test-signature';

/** The address the page is on, as the browser sets it. */
function visit(address: string) {
	window.history.replaceState(null, '', address);
}

describe('useSharedInvoiceLink (ever-co/ever-gauzy#11856)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		visit('/');
	});

	it("reads the invoice and its token from the address's fragment", () => {
		visit(`/shared-invoice#id=${ID}&token=${TOKEN}`);

		const { result } = renderHook(() => useSharedInvoiceLink());

		expect(result.current).toEqual({ id: ID, token: TOKEN });
	});

	it('says an address without a link that can be one opens nothing', () => {
		visit(`/shared-invoice#id=42&token=${TOKEN}`);

		const { result } = renderHook(() => useSharedInvoiceLink());

		expect(result.current).toBeNull();
	});

	it('follows another link pasted in the same tab', () => {
		visit(`/shared-invoice#id=${ID}&token=${TOKEN}`);
		const { result } = renderHook(() => useSharedInvoiceLink());

		act(() => {
			visit(`/shared-invoice#id=${OTHER_ID}&token=${TOKEN}`);
			window.dispatchEvent(new HashChangeEvent('hashchange'));
		});

		expect(result.current).toEqual({ id: OTHER_ID, token: TOKEN });
	});

	it('back from the payment provider, opens the invoice the tab kept, whose token the address no longer carries', () => {
		visit(`/shared-invoice#id=${ID}&token=${TOKEN}`);
		keepLinkWhilePaying(ID, TOKEN);

		visit('/shared-invoice?paid=1');
		const { result } = renderHook(() => useSharedInvoiceLink());

		expect(result.current).toEqual({ id: ID, token: TOKEN });
	});

	it('keeps the kept link for a return from paying only', () => {
		keepLinkWhilePaying(ID, TOKEN);

		visit('/shared-invoice');
		const { result } = renderHook(() => useSharedInvoiceLink());

		expect(result.current).toBeNull();
	});
});
