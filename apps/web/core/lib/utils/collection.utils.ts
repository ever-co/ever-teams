/**
 * Collection utilities for working with arrays and objects
 */

/**
 * Check if array/collection is empty or nullish
 *
 * @example
 * isEmpty(null) // true
 * isEmpty([]) // true
 * isEmpty([1, 2]) // false
 * isEmpty({ a: 1 }) // false
 * isEmpty({}) // true
 *
 * @param value Value to check
 * @returns true if empty, null, or undefined
 */
export function isEmpty(value: unknown): boolean {
	if (value == null) return true;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	if (typeof value === 'string') return value.trim().length === 0;
	return false;
}

/**
 * Check if array/collection has items
 *
 * @example
 * hasItems([1, 2, 3]) // true
 * hasItems([]) // false
 * hasItems(null) // false
 *
 * @param value Value to check
 * @returns true if has items
 */
export function hasItems<T>(value: T[] | null | undefined): value is T[] {
	return Array.isArray(value) && value.length > 0;
}

/**
 * Find item in array by ID property
 *
 * @example
 * const users = [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }];
 * findById(users, '2') // { id: '2', name: 'Jane' }
 * findById(users, '3') // undefined
 *
 * @param array Array to search
 * @param id ID to find
 * @param key Property name (default: 'id')
 * @returns Found item or undefined
 */
export function findById<T extends Record<string, any>>(
	array: T[] | null | undefined,
	id: string | null | undefined,
	key: keyof T = 'id' as keyof T
): T | undefined {
	if (!hasItems(array) || !id) return undefined;
	return array.find((item) => item[key] === id);
}

/**
 * Check if array contains item with given ID
 *
 * @example
 * const users = [{ id: '1' }, { id: '2' }];
 * hasId(users, '1') // true
 * hasId(users, '3') // false
 *
 * @param array Array to search
 * @param id ID to find
 * @param key Property name (default: 'id')
 * @returns true if found
 */
export function hasId<T extends Record<string, any>>(
	array: T[] | null | undefined,
	id: string | null | undefined,
	key: keyof T = 'id' as keyof T
): boolean {
	if (!hasItems(array) || !id) return false;
	return array.some((item) => item[key] === id);
}

/**
 * Case-insensitive string includes check
 *
 * @example
 * includesIgnoreCase('Hello World', 'world') // true
 * includesIgnoreCase('Test', 'TEST') // true
 * includesIgnoreCase('foo', 'bar') // false
 *
 * @param str String to search in
 * @param search String to search for
 * @returns true if found (case-insensitive)
 */
export function includesIgnoreCase(str: string | null | undefined, search: string | null | undefined): boolean {
	if (!str || !search) return false;
	return str.toLowerCase().includes(search.toLowerCase());
}

/**
 * Filter array by case-insensitive string match
 *
 * @example
 * const users = [{ name: 'John' }, { name: 'Jane' }, { name: 'Bob' }];
 * filterByString(users, 'name', 'jo') // [{ name: 'John' }]
 *
 * @param array Array to filter
 * @param key Property to search in
 * @param search Search string
 * @returns Filtered array
 */
export function filterByString<T extends Record<string, any>>(
	array: T[] | null | undefined,
	key: keyof T,
	search: string | null | undefined
): T[] {
	if (!hasItems(array) || !search) return array || [];
	return array.filter((item) => {
		const value = item[key];
		if (typeof value !== 'string') return false;
		return includesIgnoreCase(value, search);
	});
}

/**
 * Get unique values from array by property
 *
 * @example
 * const items = [{ id: 1, type: 'A' }, { id: 2, type: 'B' }, { id: 3, type: 'A' }];
 * uniqueBy(items, 'type') // [{ id: 1, type: 'A' }, { id: 2, type: 'B' }]
 *
 * @param array Array to process
 * @param key Property to check uniqueness
 * @returns Array with unique values
 */
export function uniqueBy<T extends Record<string, any>>(
	array: T[] | null | undefined,
	key: keyof T
): T[] {
	if (!hasItems(array)) return [];
	
	const seen = new Set();
	return array.filter((item) => {
		const value = item[key];
		if (seen.has(value)) return false;
		seen.add(value);
		return true;
	});
}
