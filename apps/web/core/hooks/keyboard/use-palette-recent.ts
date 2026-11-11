'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useAtomValue } from 'jotai';
import { userState } from '@/core/stores/user/user';
import type { PaletteItem } from '@/core/lib/utils/palette-items';
import { paletteStorageOrNull, readPaletteRecent, rememberPaletteRecent } from '@/core/lib/utils/palette-recent';

/** The entries per person, read once from the storage; every palette reads them with `useSyncExternalStore`. */
const recentByUser = new Map<string, PaletteItem[]>();
const listeners = new Set<() => void>();
const NOTHING_RECENT: PaletteItem[] = [];

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function recentOf(userId: string | null): PaletteItem[] {
	if (!userId) return NOTHING_RECENT;
	let items = recentByUser.get(userId);
	if (!items) {
		items = readPaletteRecent(paletteStorageOrNull(), userId);
		recentByUser.set(userId, items);
	}
	return items;
}

function nothingRecent(): PaletteItem[] {
	return NOTHING_RECENT;
}

/** The entries last opened from the command palette on this device, and a way to add one. */
export function usePaletteRecent() {
	const user = useAtomValue(userState);
	const userId = user?.id ?? null;
	const items = useSyncExternalStore(subscribe, () => recentOf(userId), nothingRecent);

	const remember = useCallback(
		(item: PaletteItem) => {
			if (!userId) return;
			// Built on the list held here: with a blocked or full storage the session still remembers.
			recentByUser.set(userId, rememberPaletteRecent(paletteStorageOrNull(), userId, item, recentOf(userId)));
			for (const listener of listeners) listener();
		},
		[userId]
	);

	return { items, remember };
}
