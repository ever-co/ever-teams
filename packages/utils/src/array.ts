import isEmpty from "lodash/isEmpty";

type GroupedCollection<T> = Record<string, T[]>;

/**
 * Group a collection of items by a specified property path (supports nested properties).
 *
 * @param items - The array of items to group.
 * @param propertyPath - The key or nested key path (dot notation) to group items by.
 * @returns An object where each key is a property value and the value is an array of matching items.
 *
 * @example
 * groupByProperty([{ type: 'A' }, { type: 'B' }, { type: 'A' }], 'type');
 * // Returns: { A: [...], B: [...] }
 */
export function groupByProperty<T extends object>(items: T[], propertyPath: string): GroupedCollection<T> {
	const keys = propertyPath.split(".");
	return items.reduce<GroupedCollection<T>>((accumulator, item) => {
		const groupKey = keys.reduce((obj, key) => obj?.[key], item as any) ?? "Undefined";
		(accumulator[groupKey] = accumulator[groupKey] || []).push(item);
		return accumulator;
	}, {});
}

/**
 * Sort an array of objects based on a specific property path and order direction.
 *
 * @param collection - The array to sort.
 * @param propertyPath - The key or nested key path (dot notation) used for sorting.
 * @param direction - Sort direction, either "ascending" (default) or "descending".
 * @returns The sorted array.
 *
 * @example
 * sortByProperty([{ value: 2 }, { value: 1 }], 'value');
 * // Returns: [{ value: 1 }, { value: 2 }]
 */
export function sortByProperty<T>(
	collection: T[],
	propertyPath: string,
	direction: "ascending" | "descending" = "ascending"
): T[] {
	if (!Array.isArray(collection) || collection.length === 0) return [];

	const keys = propertyPath.startsWith("-") ? propertyPath.slice(1).split(".") : propertyPath.split(".");
	const sortOrder = propertyPath.startsWith("-") ? "descending" : direction;

	return [...collection].sort((a, b) => {
		const aValue = keys.reduce((obj, key) => obj?.[key], a as any);
		const bValue = keys.reduce((obj, key) => obj?.[key], b as any);
		if (aValue === bValue) return 0;
		return (aValue < bValue ? -1 : 1) * (sortOrder === "ascending" ? 1 : -1);
	});
}

/**
 * Determine if a collection contains duplicate elements.
 *
 * @param values - The array to check.
 * @returns True if duplicates exist, otherwise false.
 *
 * @example
 * hasDuplicates([1, 2, 2, 3]); // true
 * hasDuplicates([1, 2, 3]); // false
 */
export function hasDuplicates<T>(values: T[]): boolean {
	return new Set(values).size !== values.length;
}

/**
 * Find the longest string within an array of strings.
 *
 * @param strings - The array of strings.
 * @returns The string with the maximum number of characters, or an empty string if the array is empty.
 *
 * @example
 * findLongestString(['a', 'bb', 'ccc']); // 'ccc'
 */
export function findLongestString(strings: string[]): string {
	return strings.reduce((longest, current) => (current.length > longest.length ? current : longest), "");
}

/**
 * Check if two arrays contain the same elements, regardless of order.
 *
 * @param first - First array.
 * @param second - Second array.
 * @returns True if arrays contain the same elements, otherwise false.
 *
 * @example
 * arraysHaveSameElements([1, 2], [2, 1]); // true
 * arraysHaveSameElements([1, 2], [1, 3]); // false
 */
export function arraysHaveSameElements<T>(first: T[] | null, second: T[] | null): boolean {
	if (!Array.isArray(first) || !Array.isArray(second)) return false;
	if (first.length !== second.length) return false;

	const sortedFirst = [...first].sort();
	const sortedSecond = [...second].sort();

	return sortedFirst.every((value, index) => value === sortedSecond[index]);
}

/**
 * Group an array of items by a specific field name.
 *
 * @param items - Array of objects.
 * @param field - Field to group by.
 * @returns An object grouped by the specified field.
 *
 * @example
 * groupByField([{ category: 'X' }, { category: 'Y' }], 'category');
 */
export function groupByField<T>(items: T[], field: keyof T): GroupedCollection<T> {
	return items.reduce<GroupedCollection<T>>((groups, item) => {
		const groupKey = String(item[field]);
		(groups[groupKey] = groups[groupKey] || []).push(item);
		return groups;
	}, {});
}

/**
 * Sort a collection of objects based on a simple field.
 *
 * @param items - The array to sort.
 * @param field - Field to sort by.
 * @returns Sorted array.
 *
 * @example
 * sortObjectsByField([{ value: 3 }, { value: 1 }], 'value');
 */
export function sortObjectsByField<T>(items: T[], field: keyof T): T[] {
	return [...items].sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0));
}

/**
 * Order groups of data internally by a given field.
 *
 * @param groupedData - The grouped data to reorder.
 * @param field - Field to use for sorting items within each group.
 * @returns The grouped data with ordered items.
 *
 * @example
 * orderGroupedDataByField({ A: [{ value: 2 }, { value: 1 }] }, 'value');
 */
export function orderGroupedDataByField<T>(groupedData: GroupedCollection<T>, field: keyof T): GroupedCollection<T> {
	const orderedGroups: GroupedCollection<T> = {};

	for (const key in groupedData) {
		if (Object.prototype.hasOwnProperty.call(groupedData, key)) {
			orderedGroups[key] = sortObjectsByField(groupedData[key], field);
		}
	}

	return orderedGroups;
}

/**
 * Extracts valid (truthy) keys from an object.
 *
 * @param obj - Object to evaluate.
 * @returns Array of keys with truthy values.
 *
 * @example
 * extractTruthyKeys({ a: 1, b: 0, c: null }); // ['a']
 */
export function extractTruthyKeys(obj: Record<string, any>): string[] {
	if (!obj || isEmpty(obj) || typeof obj !== "object" || Array.isArray(obj)) return [];

	return Object.keys(obj).filter((key) => Boolean(obj[key]));
}

/**
 * Convert an array of strings into an object where each key maps to true.
 *
 * @param strings - Array of string keys.
 * @returns Object with keys mapped to true.
 *
 * @example
 * arrayToBooleanMap(['a', 'b']);
 * // Returns: { a: true, b: true }
 */
export function arrayToBooleanMap(strings: string[]): Record<string, boolean> {
	return strings.reduce(
		(accumulator, key) => {
			accumulator[key] = true;
			return accumulator;
		},
		{} as Record<string, boolean>
	);
}
