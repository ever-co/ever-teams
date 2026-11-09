/**
 * What the Docs pages remember on this device, per organization: the pages last opened (the Recent section and
 * the page `/docs` opens with) and which tree nodes are expanded. Pure over a storage-like object, so the specs
 * run without a browser.
 */

export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export const DOCS_RECENT_MAX = 10;

const recentKey = (organizationId: string) => `docs:recent:${organizationId}`;
const expandedKey = (organizationId: string) => `docs:expanded:${organizationId}`;

function readList(storage: KeyValueStorage | null, key: string): string[] {
	if (!storage) return [];
	try {
		const parsed: unknown = JSON.parse(storage.getItem(key) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
	} catch {
		return [];
	}
}

function writeList(storage: KeyValueStorage | null, key: string, list: readonly string[]): void {
	if (!storage) return;
	try {
		storage.setItem(key, JSON.stringify(list));
	} catch {
		// A full or disabled storage only loses the memory, never the page.
	}
}

/** The ids of the pages last opened, newest first. */
export function readRecent(storage: KeyValueStorage | null, organizationId: string): string[] {
	return readList(storage, recentKey(organizationId));
}

/** Puts `pageId` first and returns the new list. */
export function rememberRecent(storage: KeyValueStorage | null, organizationId: string, pageId: string): string[] {
	const next = [pageId, ...readRecent(storage, organizationId).filter((id) => id !== pageId)].slice(0, DOCS_RECENT_MAX);
	writeList(storage, recentKey(organizationId), next);
	return next;
}

/** Drops a page that was trashed or deleted. */
export function forgetRecent(storage: KeyValueStorage | null, organizationId: string, pageId: string): string[] {
	const next = readRecent(storage, organizationId).filter((id) => id !== pageId);
	writeList(storage, recentKey(organizationId), next);
	return next;
}

/** The page `/docs` opens with: the last one opened that is still in `known`. */
export function lastVisited(storage: KeyValueStorage | null, organizationId: string, known: ReadonlySet<string>): string | null {
	return readRecent(storage, organizationId).find((id) => known.has(id)) ?? null;
}

export function readExpanded(storage: KeyValueStorage | null, organizationId: string): Set<string> {
	return new Set(readList(storage, expandedKey(organizationId)));
}

export function writeExpanded(storage: KeyValueStorage | null, organizationId: string, expanded: ReadonlySet<string>): void {
	writeList(storage, expandedKey(organizationId), [...expanded]);
}

/** The browser's local storage, or null where there is none (a server render, a locked-down browser). */
export function localStorageOrNull(): KeyValueStorage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch {
		return null;
	}
}
