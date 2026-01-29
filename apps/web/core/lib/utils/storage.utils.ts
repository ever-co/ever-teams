/**
 * Local Storage utilities
 */

/**
 * Safely parse JSON string with fallback value
 *
 * @example
 * const data = safeJsonParse<User>('{"name":"John"}', null);
 * const invalid = safeJsonParse<number[]>('invalid', []);
 *
 * @param json JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed value or fallback
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
	if (!json) return fallback;
	
	try {
		return JSON.parse(json) as T;
	} catch {
		return fallback;
	}
}

/**
 * Get item from localStorage and parse as JSON with fallback
 *
 * @example
 * const settings = getLocalStorageItem<Settings>('user-settings', defaultSettings);
 * const items = getLocalStorageItem<string[]>('recent-items', []);
 *
 * @param key localStorage key
 * @param fallback Fallback value if key doesn't exist or parsing fails
 * @returns Parsed value or fallback
 */
export function getLocalStorageItem<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback;
	
	try {
		const item = window.localStorage.getItem(key);
		return safeJsonParse(item, fallback);
	} catch {
		return fallback;
	}
}

/**
 * Set item in localStorage as JSON string
 *
 * @example
 * setLocalStorageItem('user-settings', { theme: 'dark' });
 * setLocalStorageItem('items', [1, 2, 3]);
 *
 * @param key localStorage key
 * @param value Value to store
 */
export function setLocalStorageItem<T>(key: string, value: T): void {
	if (typeof window === 'undefined') return;
	
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Failed to set localStorage item '${key}':`, error);
	}
}

/**
 * Ensure value is an array, returning empty array if not
 *
 * @example
 * const items = ensureArray(data.items);
 * const ids = ensureArray(response?.ids);
 *
 * @param value Value to check
 * @returns Array value or empty array
 */
export function ensureArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? value : [];
}
