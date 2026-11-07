'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { draftKeyOf } from '@/core/lib/utils/chat-format';

/**
 * The drafts, by key: what the composers of this page know, backed by local storage when it can be written (storage
 * can be blocked: a draft then lives here until the page unloads). One store for every composer, read with
 * `useSyncExternalStore`, so a draft is never set from an effect and the server renders every composer empty.
 */
const drafts = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string {
	const known = drafts.get(key);
	if (known !== undefined) return known;
	let stored = '';
	try {
		stored = window.localStorage.getItem(key) ?? '';
	} catch {
		stored = '';
	}
	drafts.set(key, stored);
	return stored;
}

function write(key: string, value: string): void {
	drafts.set(key, value);
	try {
		if (value) window.localStorage.setItem(key, value);
		else window.localStorage.removeItem(key);
	} catch {
		// Storage can be blocked: the draft lives in memory until the page unloads.
	}
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function noDraft(): string {
	return '';
}

/** The composer's unsent text per conversation (and thread), kept in local storage across navigation. */
export function useChatDraft(conversationId: string | null, threadRootId: string | null = null) {
	const key = conversationId ? draftKeyOf(conversationId, threadRootId) : null;
	const draft = useSyncExternalStore(subscribe, () => (key ? read(key) : ''), noDraft);

	const setDraft = useCallback(
		(value: string) => {
			if (key) write(key, value);
		},
		[key]
	);

	const clearDraft = useCallback(() => setDraft(''), [setDraft]);

	return { draft, setDraft, clearDraft };
}
