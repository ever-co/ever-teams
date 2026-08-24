'use client';

import { useSyncExternalStore } from 'react';
import { ACCESS_TOKEN_REFRESHED_EVENT, getAccessTokenCookie } from '@/core/lib/helpers/cookies';

const subscribe = (onStoreChange: () => void) => {
	if (typeof window === 'undefined') return () => undefined;

	window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, onStoreChange);
	return () => window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, onStoreChange);
};

const getSnapshot = () => getAccessTokenCookie();
const getServerSnapshot = () => null;

/** Keeps request-owner scopes aligned with every successful access-token rotation. */
export function useReactiveAccessTokenCookie() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
