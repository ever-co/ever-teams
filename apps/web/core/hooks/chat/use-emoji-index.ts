'use client';

import { useEffect, useState } from 'react';
import { buildEmojiIndex, type ChatEmojiDataset, type ChatEmojiEntry } from '@/core/lib/utils/chat-emoji';

let loaded: ChatEmojiEntry[] | null = null;
let loading: Promise<ChatEmojiEntry[]> | null = null;

/**
 * The emoji the autocomplete offers, from the picker's own dataset: fetched the first time someone types `:` and two
 * letters (never with the page, it weighs over 400 KB), then kept for the page's life. A failed fetch is tried again
 * the next time.
 */
function loadEmojiIndex(): Promise<ChatEmojiEntry[]> {
	if (loaded) return Promise.resolve(loaded);
	if (!loading) {
		loading = import('@emoji-mart/data')
			.then((module) => {
				const data = ((module as { default?: unknown }).default ?? module) as ChatEmojiDataset;
				loaded = buildEmojiIndex(data);
				return loaded;
			})
			.catch((error: unknown) => {
				loading = null;
				throw error;
			});
	}
	return loading;
}

/** The emoji index once `wanted` (the composer holds an emoji query); null until it is there. */
export function useEmojiIndex(wanted: boolean): ChatEmojiEntry[] | null {
	const [index, setIndex] = useState<ChatEmojiEntry[] | null>(loaded);

	useEffect(() => {
		if (!wanted || index) return;
		let current = true;
		loadEmojiIndex()
			.then((entries) => {
				if (current) setIndex(entries);
			})
			.catch(() => undefined);
		return () => {
			current = false;
		};
	}, [index, wanted]);

	return index;
}
