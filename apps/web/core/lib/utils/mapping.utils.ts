/**
 * Mapping utilities for extracting properties and transforming arrays
 */

/**
 * Extract IDs from an array of objects
 * 
 * @example
 * const users = [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }];
 * extractIds(users) // ['1', '2']
 * 
 * const teams = [{ team_id: 'A' }, { team_id: 'B' }];
 * extractIds(teams, 'team_id') // ['A', 'B']
 * 
 * @param array Array of objects to extract IDs from
 * @param key Property name (default: 'id')
 * @returns Array of extracted IDs
 */
export function extractIds<T extends Record<string, any>>(
	array: T[] | null | undefined,
	key: keyof T = 'id' as keyof T
): string[] {
	if (!array || !Array.isArray(array)) return [];
	return array.map((item) => item[key]).filter((id): id is string => id != null) as string[];
}

/**
 * Extract a specific property from an array of objects
 * 
 * @example
 * const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * extractProperty(users, 'name') // ['John', 'Jane']
 * 
 * const tasks = [{ title: 'Task 1' }, { title: 'Task 2' }];
 * extractProperty(tasks, 'title') // ['Task 1', 'Task 2']
 * 
 * @param array Array of objects
 * @param key Property name to extract
 * @returns Array of extracted property values
 */
export function extractProperty<T extends Record<string, any>, K extends keyof T>(
	array: T[] | null | undefined,
	key: K
): T[K][] {
	if (!array || !Array.isArray(array)) return [];
	return array.map((item) => item[key]).filter((value) => value != null);
}

/**
 * Alias for extractProperty - common name in other libraries like lodash
 * 
 * @example
 * const users = [{ name: 'John' }, { name: 'Jane' }];
 * pluck(users, 'name') // ['John', 'Jane']
 */
export const pluck = extractProperty;

/**
 * Create a Set of IDs from an array of objects
 * Useful for efficient lookups and deduplication
 * 
 * @example
 * const tasks = [{ id: '1' }, { id: '2' }, { id: '1' }];
 * createIdSet(tasks) // Set { '1', '2' }
 * 
 * const members = [{ userId: 'A' }, { userId: 'B' }];
 * createIdSet(members, 'userId') // Set { 'A', 'B' }
 * 
 * @param array Array of objects
 * @param key Property name (default: 'id')
 * @returns Set of extracted IDs (deduplicated)
 */
export function createIdSet<T extends Record<string, any>>(
	array: T[] | null | undefined,
	key: keyof T = 'id' as keyof T
): Set<string> {
	return new Set(extractIds(array, key));
}

/**
 * Create a Set from a specific property of an array of objects
 * Generic version that works with any property type
 * 
 * @example
 * const items = [{ tag: 'react' }, { tag: 'vue' }, { tag: 'react' }];
 * createPropertySet(items, 'tag') // Set { 'react', 'vue' }
 * 
 * @param array Array of objects
 * @param key Property name to extract
 * @returns Set of extracted property values (deduplicated)
 */
export function createPropertySet<T extends Record<string, any>, K extends keyof T>(
	array: T[] | null | undefined,
	key: K
): Set<T[K]> {
	if (!array || !Array.isArray(array)) return new Set();
	return new Set(array.map((item) => item[key]).filter((value) => value != null));
}

/**
 * Group an array of objects by a property value
 * 
 * @example
 * const tasks = [
 *   { id: 1, status: 'todo' },
 *   { id: 2, status: 'done' },
 *   { id: 3, status: 'todo' }
 * ];
 * groupBy(tasks, 'status')
 * // {
 * //   todo: [{ id: 1, status: 'todo' }, { id: 3, status: 'todo' }],
 * //   done: [{ id: 2, status: 'done' }]
 * // }
 * 
 * @param array Array of objects to group
 * @param key Property name to group by
 * @returns Object with grouped arrays
 */
export function groupBy<T extends Record<string, any>, K extends keyof T>(
	array: T[] | null | undefined,
	key: K
): Record<string, T[]> {
	if (!array || !Array.isArray(array)) return {};
	
	return array.reduce((groups, item) => {
		const groupKey = String(item[key] ?? 'undefined');
		if (!groups[groupKey]) {
			groups[groupKey] = [];
		}
		groups[groupKey].push(item);
		return groups;
	}, {} as Record<string, T[]>);
}

/**
 * Create a Map from an array of objects using a key property
 * Useful for O(1) lookups
 * 
 * @example
 * const users = [{ id: '1', name: 'John' }, { id: '2', name: 'Jane' }];
 * const userMap = createMapByKey(users, 'id');
 * userMap.get('1') // { id: '1', name: 'John' }
 * 
 * @param array Array of objects
 * @param key Property name to use as Map key
 * @returns Map with key -> object mappings
 */
export function createMapByKey<T extends Record<string, any>, K extends keyof T>(
	array: T[] | null | undefined,
	key: K
): Map<T[K], T> {
	if (!array || !Array.isArray(array)) return new Map();
	return new Map(array.map((item) => [item[key], item]));
}
