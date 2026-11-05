import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { arePendingOrdersSaved, membersWithPendingOrders, sortByOrder } from './team-member-order';

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

	it('tells when the members read back carry the pending orders', () => {
		const readBack = [member('cy', 3), member('bob', 2), member('ada', 1)];

		expect(arePendingOrdersSaved(readBack, { ada: 1, cy: 3 })).toBe(true);
		expect(arePendingOrdersSaved(members, { ada: 1, cy: 3 })).toBe(false);
	});
});
