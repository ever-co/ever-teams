import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { TFavorite } from '@/core/types/schemas';

/**
 * Favourites across the app (#5017). Projects, tasks and pages are the platform's own favourites (`/favorite`); a
 * conversation's is a flag of its membership, set from the chat. They are listed together, by kind, in this order.
 */
export const FAVORITE_KINDS = ['project', 'task', 'document', 'chat'] as const;
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

/** Where the person views and manages all their favourites. */
export const FAVORITES_PATH = '/favorites';

/** Each kind's caption, in the sidebar and on the Favorites page. */
export const FAVORITE_KIND_LABEL_KEYS = {
	project: 'favorites.kinds.PROJECT',
	task: 'favorites.kinds.TASK',
	document: 'favorites.kinds.DOCUMENT',
	chat: 'favorites.kinds.CHAT'
} as const satisfies Record<FavoriteKind, string>;

/** The kinds kept in `/favorite`. */
export type PlatformFavoriteKind = Exclude<FavoriteKind, 'chat'>;

/** The platform's entity name of each kind kept in `/favorite`. */
export const FAVORITE_ENTITY_OF: Readonly<Record<PlatformFavoriteKind, EBaseEntityEnum>> = {
	project: EBaseEntityEnum.OrganizationProject,
	task: EBaseEntityEnum.Task,
	document: EBaseEntityEnum.Document
};

type FavoriteRow = Pick<TFavorite, 'id' | 'entity' | 'entityId'>;

/** The person's favourite of an item, if they have one. */
export function favoriteOf<T extends FavoriteRow>(
	favorites: ReadonlyArray<T>,
	entity: string,
	entityId: string
): T | undefined {
	return favorites.find((favorite) => favorite.entity === entity && favorite.entityId === entityId);
}

/** The ids of the items of one entity the person has as favourites. */
export function favoriteIdsOf(favorites: ReadonlyArray<FavoriteRow>, entity: string): Set<string> {
	return new Set(favorites.filter((favorite) => favorite.entity === entity).map((favorite) => favorite.entityId));
}

/** The cached list with one favourite more: what the list will be once the platform has filed it. */
export function withFavoriteAdded<T extends FavoriteRow>(
	page: PaginationResponse<T> | undefined,
	favorite: T
): PaginationResponse<T> {
	const items = [...(page?.items ?? []), favorite];
	return { ...page, items, total: items.length };
}

/** The cached list without an item's favourite. */
export function withFavoriteRemoved<T extends FavoriteRow>(
	page: PaginationResponse<T> | undefined,
	entity: string,
	entityId: string
): PaginationResponse<T> {
	const items = (page?.items ?? []).filter(
		(favorite) => favorite.entity !== entity || favorite.entityId !== entityId
	);
	return { ...page, items, total: items.length };
}

/** A favourite as the sidebar and the Favorites page list it, with what its row needs. */
export type FavoriteEntry<Project, Task, Page, Chat> =
	| { kind: 'project'; id: string; title: string; href: string; item: Project }
	| { kind: 'task'; id: string; title: string; href: string; item: Task }
	| { kind: 'document'; id: string; title: string; href: string; item: Page }
	| { kind: 'chat'; id: string; title: string; href: string; item: Chat };

/** One kind's favourites, by name. */
export interface FavoriteGroup<Entry> {
	kind: FavoriteKind;
	entries: Entry[];
}

/**
 * One kind's favourites to resolve: the ids, and the items found for them once the source has loaded. `items` stays
 * undefined while it loads, so a favourite is never shown as gone before its source answered.
 */
export interface FavoriteSource<Item> {
	ids: ReadonlySet<string>;
	items: ReadonlyArray<Item> | undefined;
	/** Favourites whose items a second request has not brought yet (or could not): neither listed nor gone. */
	pendingIds?: ReadonlySet<string>;
	idOf: (item: Item) => string;
	titleOf: (item: Item) => string;
	hrefOf: (item: Item) => string;
}

/** A favourite whose item is gone (deleted, or out of the person's reach): listed on the page, to remove it. */
export interface UnavailableFavorite {
	kind: FavoriteKind;
	id: string;
}

export interface FavoriteSources<Project, Task, Page, Chat> {
	project?: FavoriteSource<Project>;
	task?: FavoriteSource<Task>;
	document?: FavoriteSource<Page>;
	chat?: FavoriteSource<Chat>;
}

type AnyEntry<P, T, D, C> = FavoriteEntry<P, T, D, C>;

/**
 * The favourites by kind, in the order of FAVORITE_KINDS, each kind sorted by name; a kind without favourites is left
 * out. A favourite whose source has loaded without its item is unavailable; one whose source is still loading is
 * neither listed nor unavailable yet.
 */
export function favoriteGroupsOf<P, T, D, C>(
	sources: FavoriteSources<P, T, D, C>
): { groups: FavoriteGroup<AnyEntry<P, T, D, C>>[]; unavailable: UnavailableFavorite[] } {
	const groups: FavoriteGroup<AnyEntry<P, T, D, C>>[] = [];
	const unavailable: UnavailableFavorite[] = [];
	for (const kind of FAVORITE_KINDS) {
		const source = sources[kind] as FavoriteSource<unknown> | undefined;
		if (!source || source.ids.size === 0 || source.items === undefined) {
			continue;
		}
		const byId = new Map(source.items.map((item) => [source.idOf(item), item]));
		const entries: AnyEntry<P, T, D, C>[] = [];
		for (const id of source.ids) {
			const item = byId.get(id);
			if (item === undefined) {
				if (!source.pendingIds?.has(id)) {
					unavailable.push({ kind, id });
				}
				continue;
			}
			entries.push({ kind, id, title: source.titleOf(item), href: source.hrefOf(item), item } as AnyEntry<
				P,
				T,
				D,
				C
			>);
		}
		entries.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
		if (entries.length > 0) {
			groups.push({ kind, entries });
		}
	}
	return { groups, unavailable };
}
