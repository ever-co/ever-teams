'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { forgetRecent, localStorageOrNull, readExpanded, readRecent, rememberRecent, writeExpanded } from '@/core/lib/utils/docs-recent';
import { useDocsScope } from './use-docs-scope';

/**
 * What this device remembers per organization — the pages last opened, the tree nodes left open — read once from
 * local storage into one store every hook reads with `useSyncExternalStore`: a change made through one hook shows
 * in every other at once, nothing is set from an effect, and the server renders as if nothing were remembered.
 */
const recentByOrganization = new Map<string, string[]>();
const expandedByOrganization = new Map<string, Set<string>>();
const listeners = new Set<() => void>();
const NO_RECENT: string[] = [];
const NONE_EXPANDED: Set<string> = new Set();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function changed(): void {
	for (const listener of listeners) listener();
}

function recentOf(organizationId: string | null): string[] {
	if (!organizationId) return NO_RECENT;
	let ids = recentByOrganization.get(organizationId);
	if (!ids) {
		ids = readRecent(localStorageOrNull(), organizationId);
		recentByOrganization.set(organizationId, ids);
	}
	return ids;
}

function expandedOf(organizationId: string | null): Set<string> {
	if (!organizationId) return NONE_EXPANDED;
	let open = expandedByOrganization.get(organizationId);
	if (!open) {
		open = readExpanded(localStorageOrNull(), organizationId);
		expandedByOrganization.set(organizationId, open);
	}
	return open;
}

function nothingRecent(): string[] {
	return NO_RECENT;
}

function nothingExpanded(): Set<string> {
	return NONE_EXPANDED;
}

/** The pages last opened on this device, for the Recent section and the page `/docs` opens with. */
export function useDocsRecent() {
	const scope = useDocsScope();
	const organizationId = scope?.organizationId ?? null;
	const recentIds = useSyncExternalStore(subscribe, () => recentOf(organizationId), nothingRecent);

	const remember = useCallback(
		(pageId: string) => {
			if (!organizationId) return;
			recentByOrganization.set(organizationId, rememberRecent(localStorageOrNull(), organizationId, pageId));
			changed();
		},
		[organizationId]
	);

	const forget = useCallback(
		(pageId: string) => {
			if (!organizationId) return;
			recentByOrganization.set(organizationId, forgetRecent(localStorageOrNull(), organizationId, pageId));
			changed();
		},
		[organizationId]
	);

	return { recentIds, remember, forget };
}

/** Which tree nodes are open, kept per organization on this device. */
export function useDocsExpanded() {
	const scope = useDocsScope();
	const organizationId = scope?.organizationId ?? null;
	const expanded = useSyncExternalStore(subscribe, () => expandedOf(organizationId), nothingExpanded);

	const update = useCallback(
		(change: (current: Set<string>) => Set<string>) => {
			if (!organizationId) return;
			const current = expandedOf(organizationId);
			const next = change(current);
			if (next === current) return;
			expandedByOrganization.set(organizationId, next);
			writeExpanded(localStorageOrNull(), organizationId, next);
			changed();
		},
		[organizationId]
	);

	const toggle = useCallback(
		(pageId: string) =>
			update((current) => {
				const next = new Set(current);
				if (next.has(pageId)) next.delete(pageId);
				else next.add(pageId);
				return next;
			}),
		[update]
	);

	const expandAll = useCallback(
		(pageIds: readonly string[]) =>
			update((current) => {
				if (pageIds.every((id) => current.has(id))) return current;
				const next = new Set(current);
				for (const id of pageIds) next.add(id);
				return next;
			}),
		[update]
	);

	const setOpen = useCallback(
		(pageId: string, open: boolean) =>
			update((current) => {
				if (current.has(pageId) === open) return current;
				const next = new Set(current);
				if (open) next.add(pageId);
				else next.delete(pageId);
				return next;
			}),
		[update]
	);

	return { expanded, toggle, expandAll, setOpen };
}
