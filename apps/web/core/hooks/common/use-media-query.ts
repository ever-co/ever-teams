'use client';

import { useCallback, useSyncExternalStore } from 'react';

const mediaQueryLists = new Map<string, MediaQueryList>();

function mediaQueryListOf(query: string) {
	const known = mediaQueryLists.get(query);
	if (known) {
		return known;
	}
	const created = window.matchMedia(query);
	mediaQueryLists.set(query, created);
	return created;
}

function matchesOnServer() {
	return false;
}

/** Whether a CSS media query matches now, updated when it starts or stops matching. */
export function useMediaQuery(query: string) {
	const subscribe = useCallback(
		(onChange: () => void) => {
			const mediaQueryList = mediaQueryListOf(query);
			mediaQueryList.addEventListener('change', onChange);
			return () => mediaQueryList.removeEventListener('change', onChange);
		},
		[query]
	);
	const getSnapshot = useCallback(() => mediaQueryListOf(query).matches, [query]);

	return useSyncExternalStore(subscribe, getSnapshot, matchesOnServer);
}
