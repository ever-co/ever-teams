'use client';

import { useSyncExternalStore } from 'react';
import { sharedReportTokenOf } from '@/core/lib/utils/shared-report-path';

function subscribeToFragment(onChange: () => void) {
	window.addEventListener('hashchange', onChange);
	return () => window.removeEventListener('hashchange', onChange);
}

function tokenOfAddress() {
	return sharedReportTokenOf(window.location.hash);
}

/** A server render has no fragment to read: the token is not known yet. */
function tokenNotReadYet() {
	return null;
}

/**
 * The token of the shared report the page was opened for, read from the fragment of its address (`#token=<token>`),
 * which no server receives. `null` until the browser has read it, empty when the address carries none. It follows
 * the fragment, so another link pasted in the same tab opens its own report.
 */
export function useSharedReportToken(): string | null {
	return useSyncExternalStore(subscribeToFragment, tokenOfAddress, tokenNotReadYet);
}
