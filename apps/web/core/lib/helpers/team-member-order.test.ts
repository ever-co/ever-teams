import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { membersWithPendingOrders, sortByOrder, unsavedPendingOrders, withoutDropOrders } from './team-member-order';

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

	it("takes back only a failed drop's orders, not those of a later drop", () => {
		const firstDrop = { ada: 1, cy: 3 };
		const laterDrop = { bob: 3, cy: 2 };
		const pending = { ...firstDrop, ...laterDrop };

		expect(withoutDropOrders(pending, firstDrop)).toEqual({ bob: 3, cy: 2 });
		expect(withoutDropOrders(firstDrop, firstDrop)).toBeNull();
		expect(withoutDropOrders(null, firstDrop)).toBeNull();
	});
});
