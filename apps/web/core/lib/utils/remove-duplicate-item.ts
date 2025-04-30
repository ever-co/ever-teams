/**
 * A dynamic function that removes duplicates from an array of items.
 *
 * @param {any[]} items - The items to check against.
 *
 * @returns {any[]} - The array of items without duplicates.
 */

export const removeDuplicateItems = <TItem extends { id: string }>(items?: TItem[]): TItem[] => {
	const seenIds = new Set<string>();

	return items
		? items.filter((item) => {
				if (seenIds.has(item.id)) {
					return false;
				} else {
					seenIds.add(item.id);
					return true;
				}
			})
		: [];
};
