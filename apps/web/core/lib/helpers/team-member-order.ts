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

/** Settled when the member carries the order, or left the team: nothing is left to wait for. */
function isOrderSettled(members: TOrganizationTeamEmployee[], memberId: string, order: number): boolean {
	const member = members.find((candidate) => candidate.id === memberId);
	if (!member) {
		return true;
	}
	return member.order === order;
}

/**
 * The pending orders the members read from the API do not carry yet: the same object when none has landed, so a
 * caller can tell nothing changed, and null once all have.
 */
export function unsavedPendingOrders(
	members: TOrganizationTeamEmployee[],
	pendingOrders: TPendingMemberOrders
): TPendingMemberOrders | null {
	const pendingEntries = Object.entries(pendingOrders);
	const unsavedEntries = pendingEntries.filter(([memberId, order]) => !isOrderSettled(members, memberId, order));
	const hasNoneSaved = unsavedEntries.length === pendingEntries.length;
	if (hasNoneSaved) {
		return pendingOrders;
	}
	if (unsavedEntries.length === 0) {
		return null;
	}
	return Object.fromEntries(unsavedEntries);
}

/** One drop's orders while its saves are on their way, apart from the drops made before or after it. */
export type TPendingDrop = { id: number; orders: TPendingMemberOrders };

/** The orders the shown list follows: a later drop's order wins over an earlier one for the same member. */
export function mergedDropOrders(drops: TPendingDrop[]): TPendingMemberOrders | null {
	if (drops.length === 0) {
		return null;
	}
	const orders: TPendingMemberOrders = {};
	for (const drop of drops) {
		Object.assign(orders, drop.orders);
	}
	return orders;
}

/** The drops still waiting for an order: the same array when none has settled, so a caller can tell. */
export function unsettledDrops(members: TOrganizationTeamEmployee[], drops: TPendingDrop[]): TPendingDrop[] {
	let hasSettled = false;
	const keptDrops: TPendingDrop[] = [];
	for (const drop of drops) {
		const remainingOrders = unsavedPendingOrders(members, drop.orders);
		if (remainingOrders === drop.orders) {
			keptDrops.push(drop);
			continue;
		}
		hasSettled = true;
		if (remainingOrders) {
			keptDrops.push({ ...drop, orders: remainingOrders });
		}
	}
	if (!hasSettled) {
		return drops;
	}
	return keptDrops;
}
