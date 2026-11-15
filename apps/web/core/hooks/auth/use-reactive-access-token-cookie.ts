'use client';

import { useSyncExternalStore } from 'react';
import { ACCESS_TOKEN_REFRESHED_EVENT } from '@/core/lib/helpers/cookies';
import { TAB_SCOPE_CHANGED_EVENT, requestAccessToken } from '@/core/lib/auth/tab-organization';

const RECONCILIATION_INTERVAL_MS = 1_000;
const subscribers = new Set<() => void>();
let lastBroadcastSnapshot: string | null | undefined;
let reconciliationInterval: number | null = null;
let scheduledReconciliation: number | null = null;

type CookieStoreTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

// The token this tab's requests go out with: the cookie's, or this tab's own while another tab has the cookies on another
// organization of the session (tab-organization.ts, #5134)
const readSnapshot = () => requestAccessToken() ?? null;

const reconcileSnapshot = () => {
	const nextSnapshot = readSnapshot();
	if (nextSnapshot === lastBroadcastSnapshot) return;
	lastBroadcastSnapshot = nextSnapshot;
	subscribers.forEach((subscriber) => subscriber());
};

const scheduleReconciliation = () => {
	if (scheduledReconciliation !== null) return;
	scheduledReconciliation = window.setTimeout(() => {
		scheduledReconciliation = null;
		reconcileSnapshot();
	}, 0);
};

const reconcileWhenVisible = () => {
	if (document.visibilityState === 'visible') reconcileSnapshot();
};

const getCookieStore = (): CookieStoreTarget | undefined =>
	(window as typeof window & { cookieStore?: CookieStoreTarget }).cookieStore;

const startReconciliation = () => {
	lastBroadcastSnapshot = readSnapshot();
	window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, reconcileSnapshot);
	window.addEventListener(TAB_SCOPE_CHANGED_EVENT, reconcileSnapshot);
	window.addEventListener('focus', reconcileSnapshot);
	window.addEventListener('pageshow', reconcileSnapshot);
	document.addEventListener('visibilitychange', reconcileWhenVisible);
	getCookieStore()?.addEventListener('change', scheduleReconciliation);
	reconciliationInterval = window.setInterval(reconcileSnapshot, RECONCILIATION_INTERVAL_MS);
};

const stopReconciliation = () => {
	window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, reconcileSnapshot);
	window.removeEventListener(TAB_SCOPE_CHANGED_EVENT, reconcileSnapshot);
	window.removeEventListener('focus', reconcileSnapshot);
	window.removeEventListener('pageshow', reconcileSnapshot);
	document.removeEventListener('visibilitychange', reconcileWhenVisible);
	getCookieStore()?.removeEventListener('change', scheduleReconciliation);
	if (reconciliationInterval !== null) window.clearInterval(reconciliationInterval);
	if (scheduledReconciliation !== null) window.clearTimeout(scheduledReconciliation);
	reconciliationInterval = null;
	scheduledReconciliation = null;
};

const subscribe = (onStoreChange: () => void) => {
	if (typeof window === 'undefined') return () => undefined;

	if (subscribers.size === 0) startReconciliation();
	subscribers.add(onStoreChange);
	return () => {
		subscribers.delete(onStoreChange);
		if (subscribers.size === 0) stopReconciliation();
	};
};

const getSnapshot = () => {
	return readSnapshot();
};
const getServerSnapshot = () => null;

/** Keeps request-owner scopes aligned with every successful access-token rotation. */
export function useReactiveAccessTokenCookie() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
