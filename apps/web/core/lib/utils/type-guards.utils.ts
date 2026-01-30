/**
 * Type guard and type checking utilities
 */

/**
 * Check if value is a string
 * 
 * @example
 * isString('hello') // true
 * isString(123) // false
 * isString(null) // false
 * 
 * @param value Value to check
 * @returns true if value is a string
 */
export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * Check if value is a non-empty string
 * 
 * @example
 * isNonEmptyString('hello') // true
 * isNonEmptyString('') // false
 * isNonEmptyString('   ') // false (after trim)
 * 
 * @param value Value to check
 * @returns true if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a number
 * 
 * @example
 * isNumber(123) // true
 * isNumber('123') // false
 * isNumber(NaN) // false
 * 
 * @param value Value to check
 * @returns true if value is a number and not NaN
 */
export function isNumber(value: unknown): value is number {
	return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 * 
 * @example
 * isBoolean(true) // true
 * isBoolean(false) // true
 * isBoolean(0) // false
 * 
 * @param value Value to check
 * @returns true if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * Check if value is null
 * 
 * @example
 * isNull(null) // true
 * isNull(undefined) // false
 * isNull(0) // false
 * 
 * @param value Value to check
 * @returns true if value is null
 */
export function isNull(value: unknown): value is null {
	return value === null;
}

/**
 * Check if value is undefined
 * 
 * @example
 * isUndefined(undefined) // true
 * isUndefined(null) // false
 * isUndefined(0) // false
 * 
 * @param value Value to check
 * @returns true if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

/**
 * Check if value is null or undefined
 * 
 * @example
 * isNullish(null) // true
 * isNullish(undefined) // true
 * isNullish(0) // false
 * isNullish('') // false
 * 
 * @param value Value to check
 * @returns true if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
	return value == null;
}

/**
 * Check if value is defined (not null or undefined)
 * 
 * @example
 * isDefined(0) // true
 * isDefined('') // true
 * isDefined(null) // false
 * isDefined(undefined) // false
 * 
 * @param value Value to check
 * @returns true if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
	return value != null;
}

/**
 * Check if value is an array
 * 
 * @example
 * isArray([1, 2, 3]) // true
 * isArray('not array') // false
 * isArray(null) // false
 * 
 * @param value Value to check
 * @returns true if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * Check if value is a non-empty array
 * 
 * @example
 * isNonEmptyArray([1, 2, 3]) // true
 * isNonEmptyArray([]) // false
 * isNonEmptyArray(null) // false
 * 
 * @param value Value to check
 * @returns true if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: T[] | null | undefined): value is T[] {
	return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is an object (not null, not array)
 * 
 * @example
 * isObject({ a: 1 }) // true
 * isObject([1, 2, 3]) // false
 * isObject(null) // false
 * isObject('string') // false
 * 
 * @param value Value to check
 * @returns true if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a plain object (created by {} or new Object())
 * 
 * @example
 * isPlainObject({ a: 1 }) // true
 * isPlainObject(new Date()) // false
 * isPlainObject([1, 2]) // false
 * 
 * @param value Value to check
 * @returns true if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	
	const proto = Object.getPrototypeOf(value);
	return proto === null || proto === Object.prototype;
}

/**
 * Check if value is a function
 * 
 * @example
 * isFunction(() => {}) // true
 * isFunction(function() {}) // true
 * isFunction('not function') // false
 * 
 * @param value Value to check
 * @returns true if value is a function
 */
export function isFunction(value: unknown): value is (...args: any[]) => any {
	return typeof value === 'function';
}

/**
 * Check if value is a Date object
 * 
 * @example
 * isDate(new Date()) // true
 * isDate('2023-01-01') // false
 * isDate(1234567890) // false
 * 
 * @param value Value to check
 * @returns true if value is a Date object
 */
export function isDate(value: unknown): value is Date {
	return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a Promise
 * 
 * @example
 * isPromise(Promise.resolve()) // true
 * isPromise(async () => {}) // false (it's a function that returns a promise)
 * isPromise({ then: () => {} }) // true (promise-like)
 * 
 * @param value Value to check
 * @returns true if value is a Promise
 */
export function isPromise(value: unknown): value is Promise<unknown> {
	return value instanceof Promise || (
		typeof value === 'object' &&
		value !== null &&
		'then' in value &&
		typeof (value as any).then === 'function'
	);
}

/**
 * Check if value is an Error object
 * 
 * @example
 * isError(new Error()) // true
 * isError(new TypeError()) // true
 * isError('error string') // false
 * 
 * @param value Value to check
 * @returns true if value is an Error
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}

/**
 * Check if value is a RegExp
 * 
 * @example
 * isRegExp(/test/) // true
 * isRegExp(new RegExp('test')) // true
 * isRegExp('test') // false
 * 
 * @param value Value to check
 * @returns true if value is a RegExp
 */
export function isRegExp(value: unknown): value is RegExp {
	return value instanceof RegExp;
}

/**
 * Check if value has a specific property
 * 
 * @example
 * hasProperty({ name: 'John' }, 'name') // true
 * hasProperty({ name: 'John' }, 'age') // false
 * 
 * @param obj Object to check
 * @param prop Property name to check for
 * @returns true if object has the property
 */
export function hasProperty<T extends object, K extends PropertyKey>(
	obj: T,
	prop: K
): obj is T & Record<K, unknown> {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Check if value is an empty value (null, undefined, empty string, empty array, empty object)
 * 
 * @example
 * isEmptyValue(null) // true
 * isEmptyValue('') // true
 * isEmptyValue([]) // true
 * isEmptyValue({}) // true
 * isEmptyValue(0) // false
 * isEmptyValue('hello') // false
 * 
 * @param value Value to check
 * @returns true if value is empty
 */
export function isEmptyValue(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === 'string') return value.trim().length === 0;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return false;
}

/**
 * Type guard to check if value is of a specific type
 * Useful for filtering arrays
 * 
 * @example
 * const mixed = [1, 'hello', 2, 'world', null];
 * mixed.filter(isType('number')) // [1, 2]
 * mixed.filter(isType('string')) // ['hello', 'world']
 * 
 * @param type Type to check for
 * @returns Type guard function
 */
export function isType<T extends 'string' | 'number' | 'boolean' | 'object' | 'function'>(
	type: T
): (value: unknown) => value is Extract<unknown, T> {
	return (value: unknown): value is any => typeof value === type;
}

/**
 * Assert that a value is defined (throws if not)
 * Useful for narrowing types in TypeScript
 * 
 * @example
 * const value: string | null = getValue();
 * assertDefined(value); // throws if null/undefined
 * // TypeScript now knows value is string
 * 
 * @param value Value to assert
 * @param message Optional error message
 * @throws Error if value is null or undefined
 */
export function assertDefined<T>(
	value: T | null | undefined,
	message?: string
): asserts value is T {
	if (value == null) {
		throw new Error(message || 'Value is null or undefined');
	}
}

/**
 * Assert that a condition is true (throws if not)
 * 
 * @example
 * const age = getUserAge();
 * assert(age >= 18, 'User must be 18 or older');
 * 
 * @param condition Condition to assert
 * @param message Error message if assertion fails
 * @throws Error if condition is false
 */
export function assert(condition: boolean, message?: string): asserts condition {
	if (!condition) {
		throw new Error(message || 'Assertion failed');
	}
}
