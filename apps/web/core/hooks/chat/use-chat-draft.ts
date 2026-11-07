'use client';

import { useCallback, useEffect, useState } from 'react';
import { draftKeyOf } from '@/core/lib/utils/chat-format';

function read(key: string): string {
	try {
		return window.localStorage.getItem(key) ?? '';
	} catch {
		return '';
	}
}

function write(key: string, value: string): void {
	try {
		if (value) window.localStorage.setItem(key, value);
		else window.localStorage.removeItem(key);
	} catch {
		// Storage can be blocked: the draft lives in memory until the page unloads.
	}
}

/** The composer's unsent text per conversation (and thread), kept in local storage across navigation. */
export function useChatDraft(conversationId: string | null, threadRootId: string | null = null) {
	const key = conversationId ? draftKeyOf(conversationId, threadRootId) : null;
	const [draft, setDraftState] = useState('');

	useEffect(() => {
		setDraftState(key && typeof window !== 'undefined' ? read(key) : '');
	}, [key]);

	const setDraft = useCallback(
		(value: string) => {
			setDraftState(value);
			if (key && typeof window !== 'undefined') write(key, value);
		},
		[key]
	);

	const clearDraft = useCallback(() => setDraft(''), [setDraft]);

	return { draft, setDraft, clearDraft };
}
