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

/**
 * The orders that make two shown members trade places, as the API sorts them: every member gets a distinct rank
 * from the top (the list length) down to 1, and only members whose order differs from their rank are written. The
 * first drop on a team with equal or missing orders writes them all; later drops write the two members.
 */
export function ordersAfterSwap(
	shownMembers: TOrganizationTeamEmployee[],
	draggedIndex: number,
	targetIndex: number
): TPendingMemberOrders {
	const swappedMembers = [...shownMembers];
	swappedMembers[draggedIndex] = shownMembers[targetIndex];
	swappedMembers[targetIndex] = shownMembers[draggedIndex];
	const orders: TPendingMemberOrders = {};
	swappedMembers.forEach((member, index) => {
		const rank = swappedMembers.length - index;
		const isOutOfRank = member.order !== rank;
		if (isOutOfRank) {
			orders[member.id] = rank;
		}
	});
	return orders;
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
