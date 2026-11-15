'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
	PAID_RETURN_QUERY,
	sharedInvoiceFragmentOf,
	sharedInvoiceLinkOf,
	type SharedInvoiceLink
} from '@/core/lib/utils/shared-invoice';

/** Where the tab keeps the link of the invoice the client left to pay (sessionStorage: this tab only, gone with it). */
const PAYING_LINK_KEY = 'ever-teams:shared-invoice-paying';

function subscribeToFragment(onChange: () => void) {
	window.addEventListener('hashchange', onChange);
	return () => window.removeEventListener('hashchange', onChange);
}

/** The page came back from the payment provider (paymentReturnUrlOf), whose address carries no link. */
function isPaymentReturn(): boolean {
	return new URLSearchParams(window.location.search).get(PAID_RETURN_QUERY) === '1';
}

function keptLinkFragment(): string | null {
	try {
		return window.sessionStorage.getItem(PAYING_LINK_KEY);
	} catch {
		return null;
	}
}

/** The fragment that names the invoice: the address's own, or, back from paying, the one the tab kept. */
function linkFragmentOfAddress(): string {
	const hash = window.location.hash;
	if (sharedInvoiceLinkOf(hash) || !isPaymentReturn()) {
		return hash;
	}
	return keptLinkFragment() ?? hash;
}

/** A server render has no fragment to read: the link is not known yet. */
function linkNotReadYet() {
	return null;
}

/**
 * Keeps the link for this tab while the client pays: the provider sends them back to the page without it, so the token
 * is neither in the provider's records nor in the address they come back on.
 */
export function keepLinkWhilePaying(id: string, token: string): void {
	try {
		window.sessionStorage.setItem(PAYING_LINK_KEY, sharedInvoiceFragmentOf(id, token));
	} catch {
		// Storage refused (private mode): back from paying, the page says the payment is being confirmed, without the invoice
	}
}

/**
 * The invoice the public page was opened for, read from the fragment of its address (`#id=<id>&token=<token>`), which
 * no server receives. `undefined` until the browser has read it, `null` when the address carries no link that can be
 * one. It follows the fragment, so another link pasted in the same tab opens its own invoice.
 */
export function useSharedInvoiceLink(): SharedInvoiceLink | null | undefined {
	const fragment = useSyncExternalStore(subscribeToFragment, linkFragmentOfAddress, linkNotReadYet);
	return useMemo(() => (fragment === null ? undefined : sharedInvoiceLinkOf(fragment)), [fragment]);
}
