import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import {
	membersWithPendingOrders,
	mergedDropOrders,
	ordersAfterSwap,
	sortByOrder,
	unsavedPendingOrders,
	unsettledDrops,
	type TPendingDrop
} from './team-member-order';

const member = (id: string, order?: number) => ({ id, order }) as TOrganizationTeamEmployee;

describe('team member order', () => {
	const members = [member('ada', 3), member('bob', 2), member('cy', 1)].sort(sortByOrder);

	it('shows a drop at once: the two members trade places', () => {
		const shown = membersWithPendingOrders(members, { ada: 1, cy: 3 });

		expect(shown.map((shownMember) => shownMember.id)).toEqual(['cy', 'bob', 'ada']);
	});

	it('keeps the list as it is without pending orders', () => {
		expect(membersWithPendingOrders(members, null)).toBe(members);
	});

	it('drops the pending orders the members read back already carry', () => {
		const pending = { ada: 1, cy: 3 };
		const readBack = [member('cy', 3), member('bob', 2), member('ada', 1)];
		const halfSaved = [member('ada', 1), member('bob', 2), member('cy', 1)];

		expect(unsavedPendingOrders(members, pending)).toBe(pending);
		expect(unsavedPendingOrders(halfSaved, pending)).toEqual({ cy: 3 });
		expect(unsavedPendingOrders(readBack, pending)).toBeNull();
	});

	it('lets a later drop win for a member both drops moved', () => {
		const drops: TPendingDrop[] = [
			{ id: 1, orders: { ada: 1, cy: 3 } },
			{ id: 2, orders: { bob: 3, cy: 2 } }
		];

		expect(mergedDropOrders(drops)).toEqual({ ada: 1, cy: 2, bob: 3 });
		expect(mergedDropOrders([])).toBeNull();
	});

	it('keeps a later drop that gave a member the same order as a failed one', () => {
		const laterDrop = { id: 2, orders: { ada: 1 } };
		const drops: TPendingDrop[] = [{ id: 1, orders: { ada: 1, cy: 3 } }, laterDrop];

		const afterFailure = drops.filter((drop) => drop.id !== 1);

		expect(mergedDropOrders(afterFailure)).toEqual({ ada: 1 });
	});

	it('drops the settled orders of each drop, and the same array when none settled', () => {
		const drops: TPendingDrop[] = [
			{ id: 1, orders: { ada: 1 } },
			{ id: 2, orders: { cy: 3 } }
		];

		expect(unsettledDrops(members, drops)).toBe(drops);
		expect(unsettledDrops([member('ada', 1), member('cy', 1)], drops)).toEqual([{ id: 2, orders: { cy: 3 } }]);
	});

	it('ranks every member from the top when the orders are equal or missing', () => {
		const unordered = [member('ada'), member('bob'), member('cy'), member('dee')];

		expect(ordersAfterSwap(unordered, 0, 2)).toEqual({ cy: 4, bob: 3, ada: 2, dee: 1 });
	});

	it('writes only the two members once the ranks are in place', () => {
		const ranked = [member('ada', 4), member('bob', 3), member('cy', 2), member('dee', 1)];

		expect(ordersAfterSwap(ranked, 0, 3)).toEqual({ dee: 4, ada: 1 });
	});

	it('moves a dropped member to the exact place it was dropped on', () => {
		const ranked = [member('ada', 4), member('bob', 3), member('cy', 2), member('dee', 1)];
		const orders = ordersAfterSwap(ranked, 0, 2);

		const shown = membersWithPendingOrders(ranked, orders);

		expect(shown.map((shownMember) => shownMember.id)).toEqual(['cy', 'bob', 'ada', 'dee']);
	});

	it('stops waiting for a member that left the team', () => {
		const stayed = [member('ada', 1), member('bob', 2)];

		expect(unsavedPendingOrders(stayed, { ada: 1, cy: 3 })).toBeNull();
	});
});
