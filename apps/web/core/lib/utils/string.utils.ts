/**
 * String manipulation and formatting utilities
 */

/**
 * Normalize string by trimming and converting to lowercase
 * 
 * @example
 * normalizeString('  Hello World  ') // 'hello world'
 * normalizeString('TEST') // 'test'
 * normalizeString(null) // ''
 * 
 * @param str String to normalize
 * @returns Normalized string (trimmed and lowercase)
 */
export function normalizeString(str: string | null | undefined): string {
	if (!str) return '';
	return str.trim().toLowerCase();
}

/**
 * Convert kebab-case to space-separated words
 * 
 * @example
 * kebabToSpaces('hello-world') // 'hello world'
 * kebabToSpaces('task-in-progress') // 'task in progress'
 * kebabToSpaces('simple') // 'simple'
 * 
 * @param str Kebab-case string
 * @returns Space-separated string
 */
export function kebabToSpaces(str: string | null | undefined): string {
	if (!str) return '';
	return str.split('-').join(' ');
}

/**
 * Convert space-separated words to kebab-case
 * 
 * @example
 * spacesToKebab('hello world') // 'hello-world'
 * spacesToKebab('Task In Progress') // 'Task-In-Progress'
 * spacesToKebab('simple') // 'simple'
 * 
 * @param str Space-separated string
 * @returns Kebab-case string
 */
export function spacesToKebab(str: string | null | undefined): string {
	if (!str) return '';
	return str.split(' ').join('-');
}

/**
 * Convert kebab-case to title case (capitalized words separated by spaces)
 * 
 * @example
 * kebabToTitleCase('hello-world') // 'Hello World'
 * kebabToTitleCase('task-in-progress') // 'Task In Progress'
 * 
 * @param str Kebab-case string
 * @returns Title case string
 */
export function kebabToTitleCase(str: string | null | undefined): string {
	if (!str) return '';
	return str
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

/**
 * Convert camelCase to kebab-case
 * 
 * @example
 * camelToKebab('helloWorld') // 'hello-world'
 * camelToKebab('taskInProgress') // 'task-in-progress'
 * 
 * @param str CamelCase string
 * @returns Kebab-case string
 */
export function camelToKebab(str: string | null | undefined): string {
	if (!str) return '';
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 * 
 * @example
 * kebabToCamel('hello-world') // 'helloWorld'
 * kebabToCamel('task-in-progress') // 'taskInProgress'
 * 
 * @param str Kebab-case string
 * @returns CamelCase string
 */
export function kebabToCamel(str: string | null | undefined): string {
	if (!str) return '';
	return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Capitalize first letter of string
 * 
 * @example
 * capitalize('hello') // 'Hello'
 * capitalize('WORLD') // 'WORLD'
 * capitalize('') // ''
 * 
 * @param str String to capitalize
 * @returns String with first letter capitalized
 */
export function capitalize(str: string | null | undefined): string {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to specified length with ellipsis
 * 
 * @example
 * truncate('Hello World', 5) // 'Hello...'
 * truncate('Short', 10) // 'Short'
 * truncate('Test', 4, '...') // 'Test'
 * 
 * @param str String to truncate
 * @param maxLength Maximum length before truncation
 * @param ellipsis Ellipsis string (default: '...')
 * @returns Truncated string
 */
export function truncate(str: string | null | undefined, maxLength: number, ellipsis: string = '...'): string {
	if (!str) return '';
	if (str.length <= maxLength) return str;
	return str.substring(0, maxLength) + ellipsis;
}

/**
 * Remove extra whitespace and normalize spaces
 * 
 * @example
 * normalizeWhitespace('  hello   world  ') // 'hello world'
 * normalizeWhitespace('test\n\nstring') // 'test string'
 * 
 * @param str String to normalize
 * @returns String with normalized whitespace
 */
export function normalizeWhitespace(str: string | null | undefined): string {
	if (!str) return '';
	return str.trim().replace(/\s+/g, ' ');
}

/**
 * Check if string contains substring (case-insensitive)
 * 
 * @example
 * containsIgnoreCase('Hello World', 'world') // true
 * containsIgnoreCase('Test', 'TEST') // true
 * containsIgnoreCase('foo', 'bar') // false
 * 
 * @param str String to search in
 * @param search Substring to search for
 * @returns true if substring found (case-insensitive)
 */
export function containsIgnoreCase(str: string | null | undefined, search: string | null | undefined): boolean {
	if (!str || !search) return false;
	return str.toLowerCase().includes(search.toLowerCase());
}

/**
 * Safe JSON parse with fallback
 * 
 * @example
 * safeJsonParse('{"name":"John"}') // { name: 'John' }
 * safeJsonParse('invalid', {}) // {}
 * safeJsonParse(null, []) // []
 * 
 * @param str JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
	if (!str) return fallback;
	try {
		return JSON.parse(str) as T;
	} catch {
		return fallback;
	}
}

/**
 * Safe JSON stringify with fallback
 * 
 * @example
 * safeJsonStringify({ name: 'John' }) // '{"name":"John"}'
 * safeJsonStringify(circularObj, '{}') // '{}'
 * 
 * @param value Value to stringify
 * @param fallback Fallback string if stringification fails
 * @returns JSON string or fallback
 */
export function safeJsonStringify(value: any, fallback: string = ''): string {
	try {
		return JSON.stringify(value);
	} catch {
		return fallback;
	}
}

/**
 * Generate a random string with specified length
 * 
 * @example
 * randomString(8) // 'a7bK9xMp'
 * randomString(4) // 'x3Qw'
 * 
 * @param length Length of random string
 * @returns Random alphanumeric string
 */
export function randomString(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Convert string to slug (URL-friendly format)
 * 
 * @example
 * slugify('Hello World!') // 'hello-world'
 * slugify('Test@#$String') // 'test-string'
 * 
 * @param str String to convert to slug
 * @returns URL-friendly slug
 */
export function slugify(str: string | null | undefined): string {
	if (!str) return '';
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Extract initials from a name
 * 
 * @example
 * getInitials('John Doe') // 'JD'
 * getInitials('Alice') // 'A'
 * getInitials('Bob Smith Jones') // 'BJ'
 * 
 * @param name Full name string
 * @param maxInitials Maximum number of initials (default: 2)
 * @returns Uppercase initials
 */
export function getInitials(name: string | null | undefined, maxInitials: number = 2): string {
	if (!name) return '';
	const words = name.trim().split(/\s+/);
	const initials = words
		.slice(0, maxInitials)
		.map(word => word.charAt(0).toUpperCase())
		.join('');
	return initials;
}
