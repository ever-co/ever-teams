/**
 * Sorting utilities for arrays
 */

/**
 * Sort order: 'asc' for ascending, 'desc' for descending
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Creates a comparator function for sorting objects by a date property
 *
 * @example
 * const plans = [
 *   { date: '2024-01-15' },
 *   { date: '2024-01-10' },
 *   { date: '2024-01-20' }
 * ];
 *
 * // Ascending order (oldest first)
 * plans.sort(sortByDateProperty('date', 'asc'));
 *
 * // Descending order (newest first)
 * plans.sort(sortByDateProperty('date', 'desc'));
 *
 * @param key The property key containing the date
 * @param order Sort order ('asc' or 'desc')
 * @returns Comparator function for Array.sort()
 */
export function sortByDateProperty<T>(key: keyof T, order: SortOrder = 'asc'): (a: T, b: T) => number {
	return (a: T, b: T) => {
		const dateA = new Date(a[key] as any).getTime();
		const dateB = new Date(b[key] as any).getTime();
		return order === 'asc' ? dateA - dateB : dateB - dateA;
	};
}

/**
 * Creates a comparator function for sorting objects by a string property using localeCompare
 *
 * @example
 * const tasks = [
 *   { title: 'Zebra Task' },
 *   { title: 'Apple Task' },
 *   { title: 'Banana Task' }
 * ];
 *
 * // Ascending order (A-Z)
 * tasks.sort(sortByStringProperty('title', 'asc'));
 *
 * // Descending order (Z-A)
 * tasks.sort(sortByStringProperty('title', 'desc'));
 *
 * // Case-insensitive
 * tasks.sort(sortByStringProperty('title', 'asc', { caseInsensitive: true }));
 *
 * @param key The property key containing the string
 * @param order Sort order ('asc' or 'desc')
 * @param options Optional configuration
 * @returns Comparator function for Array.sort()
 */
export function sortByStringProperty<T>(
	key: keyof T,
	order: SortOrder = 'asc',
	options?: { caseInsensitive?: boolean }
): (a: T, b: T) => number {
	return (a: T, b: T) => {
		let strA = String(a[key] ?? '');
		let strB = String(b[key] ?? '');

		if (options?.caseInsensitive) {
			strA = strA.toLowerCase();
			strB = strB.toLowerCase();
		}

		const comparison = strA.localeCompare(strB);
		return order === 'asc' ? comparison : -comparison;
	};
}

/**
 * Creates a comparator function for sorting objects by a numeric property
 *
 * @example
 * const items = [
 *   { order: 3 },
 *   { order: 1 },
 *   { order: 2 }
 * ];
 *
 * items.sort(sortByNumberProperty('order', 'asc'));
 *
 * @param key The property key containing the number
 * @param order Sort order ('asc' or 'desc')
 * @returns Comparator function for Array.sort()
 */
export function sortByNumberProperty<T>(key: keyof T, order: SortOrder = 'asc'): (a: T, b: T) => number {
	return (a: T, b: T) => {
		const numA = Number(a[key] ?? 0);
		const numB = Number(b[key] ?? 0);
		return order === 'asc' ? numA - numB : numB - numA;
	};
}
