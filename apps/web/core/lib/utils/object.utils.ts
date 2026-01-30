/**
 * Object manipulation and utility functions
 */

/**
 * Check if object is empty (has no own properties)
 * 
 * @example
 * isEmptyObject({}) // true
 * isEmptyObject({ a: 1 }) // false
 * isEmptyObject(null) // true
 * 
 * @param obj Object to check
 * @returns true if object is empty or nullish
 */
export function isEmptyObject(obj: unknown): boolean {
	if (obj == null) return true;
	if (typeof obj !== 'object') return true;
	return Object.keys(obj).length === 0;
}

/**
 * Get all keys from an object
 * Type-safe wrapper for Object.keys with better typing
 * 
 * @example
 * const obj = { name: 'John', age: 30 };
 * objectKeys(obj) // ['name', 'age'] with proper typing
 * 
 * @param obj Object to get keys from
 * @returns Array of object keys
 */
export function objectKeys<T extends object>(obj: T): (keyof T)[] {
	return Object.keys(obj) as (keyof T)[];
}

/**
 * Get all values from an object
 * Type-safe wrapper for Object.values
 * 
 * @example
 * const obj = { name: 'John', age: 30 };
 * objectValues(obj) // ['John', 30]
 * 
 * @param obj Object to get values from
 * @returns Array of object values
 */
export function objectValues<T extends object>(obj: T): T[keyof T][] {
	return Object.values(obj) as T[keyof T][];
}

/**
 * Get all entries from an object
 * Type-safe wrapper for Object.entries
 * 
 * @example
 * const obj = { name: 'John', age: 30 };
 * objectEntries(obj) // [['name', 'John'], ['age', 30]]
 * 
 * @param obj Object to get entries from
 * @returns Array of [key, value] tuples
 */
export function objectEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
	return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Safely iterate over object keys
 * 
 * @example
 * const obj = { a: 1, b: 2, c: 3 };
 * forEachKey(obj, (key, value) => console.log(key, value));
 * 
 * @param obj Object to iterate over
 * @param callback Function to call for each key-value pair
 */
export function forEachKey<T extends object>(
	obj: T | null | undefined,
	callback: (key: keyof T, value: T[keyof T], index: number) => void
): void {
	if (!obj || typeof obj !== 'object') return;
	
	Object.keys(obj).forEach((key, index) => {
		callback(key as keyof T, obj[key as keyof T], index);
	});
}

/**
 * Safely iterate over object values
 * 
 * @example
 * const obj = { a: 1, b: 2, c: 3 };
 * forEachValue(obj, (value) => console.log(value));
 * 
 * @param obj Object to iterate over
 * @param callback Function to call for each value
 */
export function forEachValue<T extends object>(
	obj: T | null | undefined,
	callback: (value: T[keyof T], index: number) => void
): void {
	if (!obj || typeof obj !== 'object') return;
	
	Object.values(obj).forEach((value, index) => {
		callback(value as T[keyof T], index);
	});
}

/**
 * Get nested value from object using path
 * 
 * @example
 * const obj = { user: { profile: { name: 'John' } } };
 * getNestedValue(obj, 'user.profile.name') // 'John'
 * getNestedValue(obj, 'user.invalid.path', 'default') // 'default'
 * 
 * @param obj Object to get value from
 * @param path Dot-separated path to value
 * @param fallback Fallback value if path doesn't exist
 * @returns Value at path or fallback
 */
export function getNestedValue<T = any>(
	obj: any,
	path: string,
	fallback?: T
): T | undefined {
	if (!obj || typeof obj !== 'object') return fallback;
	
	const keys = path.split('.');
	let current = obj;
	
	for (const key of keys) {
		if (current == null || typeof current !== 'object') {
			return fallback;
		}
		current = current[key];
	}
	
	return current !== undefined ? current : fallback;
}

/**
 * Set nested value in object using path
 * Creates intermediate objects as needed
 * 
 * @example
 * const obj = {};
 * setNestedValue(obj, 'user.profile.name', 'John');
 * // obj is now { user: { profile: { name: 'John' } } }
 * 
 * @param obj Object to set value in
 * @param path Dot-separated path to value
 * @param value Value to set
 */
export function setNestedValue(obj: any, path: string, value: any): void {
	if (!obj || typeof obj !== 'object') return;
	
	const keys = path.split('.');
	const lastKey = keys.pop();
	
	if (!lastKey) return;
	
	let current = obj;
	for (const key of keys) {
		if (!(key in current) || typeof current[key] !== 'object') {
			current[key] = {};
		}
		current = current[key];
	}
	
	current[lastKey] = value;
}

/**
 * Pick specific properties from an object
 * 
 * @example
 * const obj = { a: 1, b: 2, c: 3, d: 4 };
 * pick(obj, ['a', 'c']) // { a: 1, c: 3 }
 * 
 * @param obj Object to pick from
 * @param keys Keys to pick
 * @returns New object with only picked keys
 */
export function pick<T extends object, K extends keyof T>(
	obj: T,
	keys: K[]
): Pick<T, K> {
	const result = {} as Pick<T, K>;
	
	for (const key of keys) {
		if (key in obj) {
			result[key] = obj[key];
		}
	}
	
	return result;
}

/**
 * Omit specific properties from an object
 * 
 * @example
 * const obj = { a: 1, b: 2, c: 3, d: 4 };
 * omit(obj, ['b', 'd']) // { a: 1, c: 3 }
 * 
 * @param obj Object to omit from
 * @param keys Keys to omit
 * @returns New object without omitted keys
 */
export function omit<T extends object, K extends keyof T>(
	obj: T,
	keys: K[]
): Omit<T, K> {
	const result = { ...obj };
	
	for (const key of keys) {
		delete result[key];
	}
	
	return result;
}

/**
 * Deep clone an object
 * 
 * @example
 * const obj = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(obj);
 * cloned.b.c = 3; // obj.b.c is still 2
 * 
 * @param obj Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
	if (obj == null || typeof obj !== 'object') return obj;
	
	// Handle Date
	if (obj instanceof Date) {
		return new Date(obj.getTime()) as any;
	}
	
	// Handle Array
	if (Array.isArray(obj)) {
		return obj.map(item => deepClone(item)) as any;
	}
	
	// Handle Object
	const cloned = {} as T;
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			cloned[key] = deepClone(obj[key]);
		}
	}
	
	return cloned;
}

/**
 * Merge objects deeply
 * 
 * @example
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { b: { d: 3 }, e: 4 };
 * deepMerge(obj1, obj2) // { a: 1, b: { c: 2, d: 3 }, e: 4 }
 * 
 * @param target Target object
 * @param sources Source objects to merge
 * @returns Merged object
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
	if (!sources.length) return target;
	
	const result = { ...target };
	
	for (const source of sources) {
		if (!source || typeof source !== 'object') continue;
		
		for (const key in source) {
			if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
			
			const sourceValue = source[key];
			const targetValue = result[key];
			
			if (
				sourceValue &&
				typeof sourceValue === 'object' &&
				!Array.isArray(sourceValue) &&
				targetValue &&
				typeof targetValue === 'object' &&
				!Array.isArray(targetValue)
			) {
				result[key] = deepMerge(targetValue, sourceValue as any);
			} else {
				result[key] = sourceValue as any;
			}
		}
	}
	
	return result;
}

/**
 * Check if two objects are deeply equal
 * 
 * @example
 * deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 }) // true
 * deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } }) // false
 * 
 * @param obj1 First object
 * @param obj2 Second object
 * @returns true if objects are deeply equal
 */
export function deepEqual(obj1: any, obj2: any): boolean {
	if (obj1 === obj2) return true;
	
	if (obj1 == null || obj2 == null) return obj1 === obj2;
	
	if (typeof obj1 !== typeof obj2) return false;
	
	if (typeof obj1 !== 'object') return obj1 === obj2;
	
	// Handle Arrays
	if (Array.isArray(obj1) && Array.isArray(obj2)) {
		if (obj1.length !== obj2.length) return false;
		return obj1.every((item, index) => deepEqual(item, obj2[index]));
	}
	
	if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
	
	// Handle Objects
	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);
	
	if (keys1.length !== keys2.length) return false;
	
	return keys1.every(key => deepEqual(obj1[key], obj2[key]));
}

/**
 * Map object values
 * 
 * @example
 * const obj = { a: 1, b: 2, c: 3 };
 * mapValues(obj, v => v * 2) // { a: 2, b: 4, c: 6 }
 * 
 * @param obj Object to map
 * @param mapper Function to map values
 * @returns New object with mapped values
 */
export function mapValues<T extends object, R>(
	obj: T,
	mapper: (value: T[keyof T], key: keyof T) => R
): Record<keyof T, R> {
	const result = {} as Record<keyof T, R>;
	
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			result[key as keyof T] = mapper(obj[key], key as keyof T);
		}
	}
	
	return result;
}

/**
 * Filter object by predicate
 * 
 * @example
 * const obj = { a: 1, b: 2, c: 3, d: 4 };
 * filterObject(obj, v => v > 2) // { c: 3, d: 4 }
 * 
 * @param obj Object to filter
 * @param predicate Function to test values
 * @returns New object with filtered values
 */
export function filterObject<T extends object>(
	obj: T,
	predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> {
	const result = {} as Partial<T>;
	
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (predicate(value, key as keyof T)) {
				result[key as keyof T] = value;
			}
		}
	}
	
	return result;
}
