'use client';

import { useState, useCallback, Dispatch, SetStateAction } from 'react';

/**
 * Custom hook to manage state that is synchronized with localStorage.
 * Handles serialization/deserialization of data and provides error handling.
 *
 * @template T - The type of the state value
 * @param {string} key - The key under which the value is stored in localStorage
 * @param {T} defaultValue - The default value to use if the key is not found in localStorage
 * @returns {[T, Dispatch<SetStateAction<T>>, () => void]} A tuple containing:
 * - The current state value
 * - A function to update the state
 * - A function to reset the state to its default value
 *
 * @example
 * const [theme, setTheme, resetTheme] = useLocalStorageState('app-theme', 'light');
 *
 * // Update theme
 * setTheme('dark');
 *
 * // Reset to default value
 * resetTheme();
 */
export const useLocalStorageState = <T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>, () => void] => {
	// Initialize state with value from localStorage or default
	const [state, setState] = useState<T>(() => {
		if (typeof window === 'undefined') return defaultValue;

		try {
			const item = window.localStorage.getItem(key);
			if (!item) return defaultValue;

			// Handle legacy string values that aren't JSON
			// If it's a simple string that matches our expected values, use it directly
			if (
				typeof defaultValue === 'string' &&
				!item.startsWith('"') &&
				!item.startsWith('{') &&
				!item.startsWith('[')
			) {
				// Clean up the localStorage by storing it properly as JSON
				const cleanValue = item as T;
				window.localStorage.setItem(key, JSON.stringify(cleanValue));
				return cleanValue;
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
	});

	// Memoize the update function to prevent unnecessary re-renders
	const updateState = useCallback(
		(value: SetStateAction<T>) => {
			setState((prevState) => {
				const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;

				// Only update localStorage if the value actually changed
				if (newValue !== prevState) {
					try {
						if (typeof window !== 'undefined') {
							window.localStorage.setItem(key, JSON.stringify(newValue));
						}
					} catch (error) {
						console.error(`Error writing to localStorage key "${key}":`, error);
					}
				}

				return newValue;
			});
		},
		[key]
	);

	// Reset state to default value
	const reset = useCallback(() => {
		try {
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(key);
			}
		} catch (error) {
			console.error(`Error removing localStorage key "${key}":`, error);
		}
		setState(defaultValue);
	}, [defaultValue, key]);

	return [state, updateState, reset];
};
