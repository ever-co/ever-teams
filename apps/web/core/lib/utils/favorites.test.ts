import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import {
	FAVORITE_ENTITY_OF,
	favoriteGroupsOf,
	favoriteIdsOf,
	favoriteOf,
	type FavoriteSource,
	withFavoriteAdded,
	withFavoriteRemoved
} from './favorites';

const favorite = (id: string, entity: string, entityId: string) => ({ id, entity, entityId });

const FAVORITES = [
	favorite('f1', EBaseEntityEnum.Task, 'task-1'),
	favorite('f2', EBaseEntityEnum.OrganizationProject, 'project-1'),
	favorite('f3', EBaseEntityEnum.Task, 'task-2')
];

describe('favoriteOf and favoriteIdsOf', () => {
	it("find an item's favourite by its entity and id, never another entity's", () => {
		expect(favoriteOf(FAVORITES, EBaseEntityEnum.Task, 'task-2')?.id).toBe('f3');
		expect(favoriteOf(FAVORITES, EBaseEntityEnum.OrganizationProject, 'task-1')).toBeUndefined();
		expect(favoriteIdsOf(FAVORITES, FAVORITE_ENTITY_OF.task)).toEqual(new Set(['task-1', 'task-2']));
	});
});

describe('withFavoriteAdded and withFavoriteRemoved', () => {
	it('change the cached list and its total, and start one from nothing', () => {
		const added = withFavoriteAdded(undefined, favorite('f9', EBaseEntityEnum.Document, 'page-1'));
		expect(added).toEqual({ items: [favorite('f9', EBaseEntityEnum.Document, 'page-1')], total: 1 });

		const removed = withFavoriteRemoved({ items: FAVORITES, total: 3 }, EBaseEntityEnum.Task, 'task-1');
		expect(removed.items.map((item) => item.id)).toEqual(['f2', 'f3']);
		expect(removed.total).toBe(2);
	});
});

interface Named {
	id: string;
	name: string;
}

const sourceOf = (ids: string[], items: Named[] | undefined): FavoriteSource<Named> => ({
	ids: new Set(ids),
	items,
	idOf: (item) => item.id,
	titleOf: (item) => item.name,
	hrefOf: (item) => `/x/${item.id}`
});

describe('favoriteGroupsOf', () => {
	it('lists the kinds in their order, each sorted by name, and leaves out a kind without favourites', () => {
		const { groups, unavailable } = favoriteGroupsOf<Named, Named, Named, Named>({
			chat: sourceOf(['c1'], [{ id: 'c1', name: 'general' }]),
			task: sourceOf(
				['t1', 't2'],
				[
					{ id: 't1', name: 'write the notes' },
					{ id: 't2', name: 'Build the page' }
				]
			),
			project: sourceOf([], [{ id: 'p1', name: 'Ever Teams' }])
		});

		expect(groups.map((group) => group.kind)).toEqual(['task', 'chat']);
		expect(groups[0].entries.map((entry) => entry.title)).toEqual(['Build the page', 'write the notes']);
		expect(groups[0].entries[0].href).toBe('/x/t2');
		expect(unavailable).toEqual([]);
	});

	it('marks a favourite whose source loaded without its item as unavailable', () => {
		const { groups, unavailable } = favoriteGroupsOf<Named, Named, Named, Named>({
			project: sourceOf(['p1', 'gone'], [{ id: 'p1', name: 'Ever Teams' }])
		});

		expect(groups[0].entries.map((entry) => entry.id)).toEqual(['p1']);
		expect(unavailable).toEqual([{ kind: 'project', id: 'gone' }]);
	});

	it('neither lists nor marks the favourites of a source still loading', () => {
		const { groups, unavailable } = favoriteGroupsOf<Named, Named, Named, Named>({
			document: sourceOf(['d1'], undefined)
		});

		expect(groups).toEqual([]);
		expect(unavailable).toEqual([]);
	});
});
