'use client';

/**
 * Utility to clean up corrupted localStorage data
 * This should be called on app initialization to fix legacy data issues
 */

/**
 * Safe localStorage getter with automatic cleanup
 */
export const safeGetLocalStorage = <T>(key: string, defaultValue: T): T => {
	if (typeof window === 'undefined') return defaultValue;

	try {
		const item = window.localStorage.getItem(key);
		if (!item) return defaultValue;

		// Handle legacy string values
		if (
			typeof defaultValue === 'string' &&
			!item.startsWith('"') &&
			!item.startsWith('{') &&
			!item.startsWith('[')
		) {
			// Clean up by storing properly as JSON
			window.localStorage.setItem(key, JSON.stringify(item));
			return item as T;
		}

		return JSON.parse(item) as T;
	} catch (error) {
		console.error(`Error reading localStorage key "${key}":`, error);
		// Clean up corrupted data
		try {
			window.localStorage.removeItem(key);
		} catch (cleanupError) {
			console.error(`Error cleaning up localStorage key "${key}":`, cleanupError);
		}
		return defaultValue;
	}
};

/**
 * Safe localStorage setter
 */
export const safeSetLocalStorage = <T>(key: string, value: T): void => {
	if (typeof window === 'undefined') return;

	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Error writing to localStorage key "${key}":`, error);
	}
};
