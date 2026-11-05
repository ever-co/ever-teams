import type { TOrganizationTeamEmployee } from '@/core/types/schemas';

/** The order a member was given, by membership id, while its save is on its way. */
export type TPendingMemberOrders = Record<string, number>;

/**
 * Higher `order` first; members without one after, then by id, so the list stays stable when orders are equal or
 * missing (role changes and refetches no longer reshuffle it).
 */
export function sortByOrder(a: TOrganizationTeamEmployee, b: TOrganizationTeamEmployee): number {
	if (a.order && b.order) {
		if (b.order !== a.order) {
			return b.order - a.order;
		}
	} else if (a.order) {
		return -1;
	} else if (b.order) {
		return 1;
	}

	return (a.id || '').localeCompare(b.id || '');
}

/** The members as they will be once the pending orders are saved, so a drop shows at once. */
export function membersWithPendingOrders(
	members: TOrganizationTeamEmployee[],
	pendingOrders: TPendingMemberOrders | null
): TOrganizationTeamEmployee[] {
	if (!pendingOrders) {
		return members;
	}
	const patchedMembers = members.map((member) => {
		const pendingOrder = pendingOrders[member.id];
		if (pendingOrder === undefined) {
			return member;
		}
		return { ...member, order: pendingOrder };
	});
	return patchedMembers.sort(sortByOrder);
}

/** Whether the members read from the API already carry every pending order. */
export function arePendingOrdersSaved(
	members: TOrganizationTeamEmployee[],
	pendingOrders: TPendingMemberOrders
): boolean {
	return Object.entries(pendingOrders).every(([memberId, order]) => {
		const member = members.find((candidate) => candidate.id === memberId);
		return member?.order === order;
	});
}
