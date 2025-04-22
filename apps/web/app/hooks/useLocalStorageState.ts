'use client';
import { useState, useEffect, Dispatch, SetStateAction, useCallback, useRef } from 'react';

type SetState<T> = Dispatch<SetStateAction<T>>;
type ResetState = () => void;
type UseLocalStorageStateReturn<T> = [T, SetState<T>, ResetState];

/**
 * A robust custom hook for managing state synchronized with localStorage.
 * Handles SSR, serialization errors, and provides clean API.
 *
 * @template T - Type of the state value
 * @param {string} key - localStorage key
 * @param {T} initialValue - Initial/default value
 * @param {object} [options] - Configuration options
 * @param {(value: T) => boolean} [options.validate] - Validation function
 * @param {(error: Error) => void} [options.onError] - Error callback
 * @returns {UseLocalStorageStateReturn<T>} State tuple
 *
 * @example
 * const [userPrefs, setUserPrefs, resetUserPrefs] = useLocalStorageState(
 *   'user-preferences',
 *   { theme: 'light', notifications: true },
 *   {
 *     validate: (val) => val !== null,
 *     onError: (err) => trackError(err)
 *   }
 * );
 */
export const useLocalStorageState = <T>(
	key: string,
	initialValue: T,
	options?: {
		validate?: (value: T) => boolean;
		onError?: (error: Error) => void;
	}
): UseLocalStorageStateReturn<T> => {
	const { validate, onError } = options || {};
	const [state, setState] = useState<T>(initialValue);
	const isMounted = useRef(false);
	const keyRef = useRef(key);

	// Handle read from localStorage safely
	const getStoredValue = useCallback((): T => {
		if (typeof window === 'undefined') return initialValue;

		try {
			const rawValue = window.localStorage.getItem(keyRef.current);
			if (rawValue === null) return initialValue;

			const parsedValue = JSON.parse(rawValue) as T;

			// Validate parsed value if validator provided
			if (validate && !validate(parsedValue)) {
				return initialValue;
			}

			return parsedValue;
		} catch (error) {
			const err = error instanceof Error ? error : new Error('LocalStorage read error');
			onError?.(err);
			console.error(`useLocalStorageState: Error reading "${keyRef.current}"`, err);
			return initialValue;
		}
	}, [initialValue, validate, onError]);

	// Initialize state after mount
	useEffect(() => {
		setState(getStoredValue());
		isMounted.current = true;

		// Handle storage events from other tabs
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === keyRef.current) {
				setState(getStoredValue());
			}
		};

		window.addEventListener('storage', handleStorageChange);
		return () => window.removeEventListener('storage', handleStorageChange);
	}, [getStoredValue]);

	// Persist to localStorage on state changes
	useEffect(() => {
		if (!isMounted.current) return;

		try {
			const serializedValue = JSON.stringify(state);
			window.localStorage.setItem(keyRef.current, serializedValue);
		} catch (error) {
			const err = error instanceof Error ? error : new Error('LocalStorage write error');
			onError?.(err);
			console.error(`useLocalStorageState: Error writing "${keyRef.current}"`, err);
		}
	}, [state, onError]);

	// Handle key changes
	useEffect(() => {
		if (key !== keyRef.current) {
			keyRef.current = key;
			setState(getStoredValue());
		}
	}, [key, getStoredValue]);

	// Reset to initial value and clear localStorage
	const reset = useCallback(() => {
		try {
			window.localStorage.removeItem(keyRef.current);
			setState(initialValue);
		} catch (error) {
			const err = error instanceof Error ? error : new Error('LocalStorage clear error');
			onError?.(err);
			console.error(`useLocalStorageState: Error clearing "${keyRef.current}"`, err);
		}
	}, [initialValue, onError]);

	return [state, setState, reset];
};
