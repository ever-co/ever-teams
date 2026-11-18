import {
	idsAfterMove,
	isMoveRefused,
	isStatusOrderSaved,
	statusItemsOf,
	statusOrderOf
} from './settings-task-properties';

// Gauzy's reorder writes `order` on the team's own statuses only (`update ... where isSystem = false`): a built-in
// status in the request makes the whole reorder answer 400 (#5359).

const BUILT_IN = { isSystem: true, organizationTeamId: null };
const OWN = { isSystem: false, organizationTeamId: 'team-1' };

/** The ids once `id` moves `offset` places in the list, as the page sends them for an ungrouped list. */
function afterMove(ids: string[], id: string, offset: -1 | 1) {
	return idsAfterMove(ids, id, ids.indexOf(id) + offset);
}

/** What the list shows once Gauzy has written `entries` (built-in statuses keep their order). */
function shownAfterSave(
	statuses: Array<{ id: string; order?: number | null }>,
	entries: Array<{ id: string; order: number }>
) {
	const orderById = new Map(entries.map((entry) => [entry.id, entry.order]));
	const saved = statuses.map((status) => ({ ...status, order: orderById.get(status.id) ?? status.order }));
	return statusItemsOf(saved).map((item) => item.id);
}

describe('the status order the settings page saves', () => {
	describe('for a team that still uses the built-in statuses', () => {
		const statuses = [
			{ id: 'open', order: 0, ...BUILT_IN },
			{ id: 'in-progress', order: 1, ...BUILT_IN },
			{ id: 'blocked', order: 2, ...BUILT_IN },
			{ id: 'done', order: 3, ...BUILT_IN }
		];
		const items = statusItemsOf(statuses);
		const ids = items.map((item) => item.id);

		it('sends no built-in status: there is nothing Gauzy can write, and no order it could save', () => {
			expect(statusOrderOf(items, ids)).toEqual([]);
			expect(statusOrderOf(items, afterMove(ids, 'blocked', -1))).toBeNull();
		});

		it('offers no move at all, up or down, on any of them', () => {
			for (const id of ids) {
				expect(isStatusOrderSaved(items, afterMove(ids, id, -1))).toBe(false);
				expect(isStatusOrderSaved(items, afterMove(ids, id, 1))).toBe(false);
				expect(isMoveRefused('status', items.find((item) => item.id === id)!)).toBe(true);
			}
		});
	});

	describe('for a team with its own statuses only', () => {
		const statuses = [
			{ id: 'todo', order: 0, ...OWN },
			{ id: 'doing', order: 1, ...OWN },
			{ id: 'review', order: null, ...OWN },
			{ id: 'shipped', order: null, ...OWN }
		];
		const items = statusItemsOf(statuses);
		const ids = items.map((item) => item.id);

		it('numbers every status in the new order, as before', () => {
			const orderedIds = afterMove(ids, 'review', -1);

			expect(statusOrderOf(items, orderedIds)).toEqual([
				{ id: 'todo', order: 0 },
				{ id: 'review', order: 1 },
				{ id: 'doing', order: 2 },
				{ id: 'shipped', order: 3 }
			]);
			expect(isStatusOrderSaved(items, orderedIds)).toBe(true);
		});

		it('keeps numbering across the groups, so the board reads them in the order of the page', () => {
			const grouped = statusItemsOf([
				{ id: 'todo', order: 0, isTodo: true, ...OWN },
				{ id: 'doing', order: 1, isInProgress: true, ...OWN },
				{ id: 'review', order: 2, isInProgress: true, ...OWN },
				{ id: 'shipped', order: 3, isDone: true, ...OWN }
			]);

			expect(statusOrderOf(grouped, ['todo', 'review', 'doing', 'shipped'])).toEqual([
				{ id: 'todo', order: 0 },
				{ id: 'review', order: 1 },
				{ id: 'doing', order: 2 },
				{ id: 'shipped', order: 3 }
			]);
		});

		it("refuses no move of the team's own status, nor of a built-in row of a kind the page does not reorder", () => {
			const [todo] = items;

			expect(isMoveRefused('status', todo)).toBe(false);
			expect(isMoveRefused('priority', { ...todo, isSystem: true })).toBe(false);
		});
	});

	describe('for a list that has both', () => {
		const statuses = [
			{ id: 'mine-first', order: 0, ...OWN },
			{ id: 'built-in', order: 5, ...BUILT_IN },
			{ id: 'mine-second', order: 6, ...OWN },
			{ id: 'mine-third', order: 7, ...OWN }
		];
		const items = statusItemsOf(statuses);
		const ids = items.map((item) => item.id);

		it('leaves the built-in status out of the request', () => {
			const entries = statusOrderOf(items, afterMove(ids, 'mine-third', -1));

			expect(entries?.map((entry) => entry.id)).toEqual(['mine-first', 'mine-third', 'mine-second']);
		});

		it('saves a move between two statuses of the team, and the list then shows it', () => {
			const orderedIds = afterMove(ids, 'mine-third', -1);
			const entries = statusOrderOf(items, orderedIds)!;

			expect(shownAfterSave(statuses, entries)).toEqual(orderedIds);
		});

		it('lets a status of the team pass a built-in one when the built-in one keeps its order', () => {
			const orderedIds = afterMove(ids, 'mine-first', 1);
			const entries = statusOrderOf(items, orderedIds)!;

			expect(entries).toEqual([
				{ id: 'mine-first', order: 6 },
				{ id: 'mine-second', order: 7 },
				{ id: 'mine-third', order: 8 }
			]);
			expect(shownAfterSave(statuses, entries)).toEqual(orderedIds);
		});

		it('offers no move that would need the built-in status to move', () => {
			const tight = statusItemsOf([
				{ id: 'mine-first', order: 0, ...OWN },
				{ id: 'built-in', order: 1, ...BUILT_IN },
				{ id: 'mine-second', order: 2, ...OWN }
			]);
			const tightIds = tight.map((item) => item.id);

			// Two statuses of the team above a built-in one at 1: only 0 is left below it
			expect(statusOrderOf(tight, afterMove(tightIds, 'mine-second', -1))).toBeNull();
			expect(isStatusOrderSaved(tight, afterMove(tightIds, 'mine-second', -1))).toBe(false);
		});

		it('offers no move below a built-in status Gauzy stores with no order: it always sorts last', () => {
			const unordered = statusItemsOf([
				{ id: 'mine', order: 0, ...OWN },
				{ id: 'built-in', order: null, ...BUILT_IN }
			]);

			expect(statusOrderOf(unordered, ['built-in', 'mine'])).toBeNull();
		});

		it('saves nothing for a status it does not list', () => {
			expect(statusOrderOf(items, [...ids, 'gone'])).toBeNull();
		});
	});
});
