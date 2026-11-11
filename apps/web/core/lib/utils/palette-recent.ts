import type { PaletteItem, PaletteItemKind } from './palette-items';

/**
 * What the command palette remembers on this device, per person: the entries last opened from it (a task, a
 * person, a project, a page, a conversation), shown while its field is empty. Pure over a storage-like object, so
 * the specs run without a browser.
 */

export interface PaletteRecentStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export const PALETTE_RECENT_MAX = 6;

const KINDS: ReadonlySet<PaletteItemKind> = new Set(['task', 'person', 'project', 'page', 'conversation']);

const recentKey = (userId: string) => `palette:recent:${userId}`;

function isPaletteItem(value: unknown): value is PaletteItem {
	if (!value || typeof value !== 'object') return false;
	const item = value as Record<string, unknown>;
	const hasText = (key: string) => typeof item[key] === 'string' && (item[key] as string).length > 0;
	return KINDS.has(item['kind'] as PaletteItemKind) && hasText('id') && hasText('title') && hasText('href');
}

/** Whether an entry leads inside the app (`/task/…`), never to another site: a stored value is not trusted. */
function isInAppPath(href: string): boolean {
	return href.startsWith('/') && !href.startsWith('//');
}

/** The entries last opened, newest first; anything malformed in the storage is skipped. */
export function readPaletteRecent(storage: PaletteRecentStorage | null, userId: string): PaletteItem[] {
	if (!storage || !userId) return [];
	try {
		const parsed: unknown = JSON.parse(storage.getItem(recentKey(userId)) ?? '[]');
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(isPaletteItem)
			.filter((item) => isInAppPath(item.href))
			.slice(0, PALETTE_RECENT_MAX);
	} catch {
		return [];
	}
}

const sameEntry = (first: Pick<PaletteItem, 'kind' | 'id'>, second: Pick<PaletteItem, 'kind' | 'id'>) =>
	first.kind === second.kind && first.id === second.id;

/** Puts the entry first (with its title as it is now) and returns the new list. */
export function rememberPaletteRecent(
	storage: PaletteRecentStorage | null,
	userId: string,
	item: PaletteItem
): PaletteItem[] {
	const entry: PaletteItem = {
		kind: item.kind,
		id: item.id,
		title: item.title,
		href: item.href,
		imageUrl: item.imageUrl ?? null,
		icon: item.icon ?? null
	};
	const current = readPaletteRecent(storage, userId);
	if (!isPaletteItem(entry) || !isInAppPath(entry.href)) return current;
	const next = [entry, ...current.filter((other) => !sameEntry(other, entry))].slice(0, PALETTE_RECENT_MAX);
	if (storage && userId) {
		try {
			storage.setItem(recentKey(userId), JSON.stringify(next));
		} catch {
			// A full or disabled storage only loses the memory, never the palette.
		}
	}
	return next;
}

/** The local storage of the browser, or null where there is none (the server, a blocked storage). */
export function paletteStorageOrNull(): PaletteRecentStorage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch {
		return null;
	}
}
