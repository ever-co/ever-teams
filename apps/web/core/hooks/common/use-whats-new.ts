'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { EVER_TEAMS_CHANGELOG_PLATFORM, changelogService } from '@/core/services/client/api/changelog.service';
import { hasUnseenEntries, newestEntryDate } from '@/core/lib/whats-new';

/** Where the browser keeps the date of the newest "What's new" entry the user has opened the panel on. */
export const WHATS_NEW_SEEN_STORAGE_KEY = 'ever-teams:whats-new:seen-at';

/** Told to this tab's readers when the panel marks entries seen (`storage` events reach the other tabs only). */
const SEEN_CHANGED_EVENT = 'ever-teams:whats-new:seen-changed';

/** The changelog changes a few times a month: one read an hour is plenty. */
const CHANGELOG_STALE_MS = 60 * 60 * 1000;

/** The last-seen date when the browser storage cannot be used (private mode, storage off): kept for the tab's life. */
let seenAtInMemory: string | null = null;

/** The later of two ISO dates; null when neither is a date. */
function laterDate(a: string | null, b: string | null): string | null {
	const time = (value: string | null) => (value ? new Date(value).getTime() : Number.NaN);
	if (Number.isNaN(time(a))) {
		return Number.isNaN(time(b)) ? null : b;
	}
	return Number.isNaN(time(b)) || time(a) >= time(b) ? a : b;
}

/**
 * The newest date the user has seen: the later of the stored one and the one kept in memory, so a full storage
 * that still reads an older date cannot hold the dot on.
 */
function readSeenAt(): string | null {
	let stored: string | null = null;
	try {
		stored = window.localStorage.getItem(WHATS_NEW_SEEN_STORAGE_KEY);
	} catch {
		// Storage off: the in-memory date only.
	}
	return laterDate(stored, seenAtInMemory);
}

function writeSeenAt(value: string): void {
	seenAtInMemory = value;
	try {
		window.localStorage.setItem(WHATS_NEW_SEEN_STORAGE_KEY, value);
	} catch {
		// Storage off: the in-memory date serves until the tab closes.
	}
	window.dispatchEvent(new Event(SEEN_CHANGED_EVENT));
}

function subscribeToSeenAt(onChange: () => void): () => void {
	window.addEventListener('storage', onChange);
	window.addEventListener(SEEN_CHANGED_EVENT, onChange);
	return () => {
		window.removeEventListener('storage', onChange);
		window.removeEventListener(SEEN_CHANGED_EVENT, onChange);
	};
}

/** The server cannot know what this browser has seen: `undefined` until the client has read its storage. */
const getServerSeenAt = (): string | null | undefined => undefined;

/** Ever Teams' "What's new" entries from the Gauzy API, newest first. */
export function useChangelogQuery() {
	return useQuery({
		queryKey: queryKeys.changelog.entries(EVER_TEAMS_CHANGELOG_PLATFORM),
		queryFn: () => changelogService.getEntries(EVER_TEAMS_CHANGELOG_PLATFORM),
		staleTime: CHANGELOG_STALE_MS,
		gcTime: CHANGELOG_STALE_MS,
		retry: 1,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});
}

/**
 * The "What's new" entries with what the user has not seen yet. The last-seen date comes from the browser storage
 * through `useSyncExternalStore`, so the server render and hydration agree (no dot) and every open tab follows
 * when one of them marks the entries seen.
 */
export function useWhatsNew() {
	const query = useChangelogQuery();
	const entries = query.data ?? [];
	const seenAt = useSyncExternalStore<string | null | undefined>(subscribeToSeenAt, readSeenAt, getServerSeenAt);

	const markSeen = useCallback(() => {
		const newest = newestEntryDate(query.data ?? []);
		// Only ever forward: a tab holding an older list must not bring back marks another tab cleared.
		if (newest && laterDate(newest, readSeenAt()) === newest && newest !== readSeenAt()) {
			writeSeenAt(newest);
		}
	}, [query.data]);

	return {
		entries,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
		seenAt: seenAt ?? null,
		hasUnseen: seenAt !== undefined && hasUnseenEntries(entries, seenAt),
		markSeen
	};
}
