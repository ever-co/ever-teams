import { useState, useEffect, useCallback } from 'react';

/* -------------------------------------------------------------------------- */
/*                                 Types & Core                               */
/* -------------------------------------------------------------------------- */

/**
 * Supported storage types.
 * - "local" for localStorage
 * - "session" for sessionStorage
 */

export type StorageType = 'local' | 'session';

/**
 * Retrieve a storage object safely depending on the type.
 *
 * @param type - Storage type ("local" | "session")
 * @returns Storage object if available (undefined otherwise)
 */
const getStorage = (type: StorageType): Storage | undefined => {
	if (typeof window === 'undefined') return undefined;
	return type === 'local' ? window.localStorage : window.sessionStorage;
};
/**
 * Read and parse a stored value from the browser storage.
 *
 * @param key - Storage key
 * @param fallback - Default value if key missing or invalid
 * @param type - Storage type
 * @returns Parsed value or fallback
 */
const readStorageValue = <T,>(key: string, fallback: T, type: StorageType): T => {
	const storage = getStorage(type);
	if (!storage) return fallback;

	try {
		const item = storage.getItem(key);
		return item ? (JSON.parse(item) as T) : fallback;
	} catch (error) {
		console.error(`[storage] Error reading key "${key}":`, error);
		storage.removeItem(key);
		return fallback;
	}
};

/**
 * Serialize and write a value into the browser storage.
 *
 * @param key - Storage key
 * @param value - Value to store
 * @param type - Storage type
 */
const writeStorageValue = <T,>(key: string, value: T, type: StorageType): void => {
	const storage = getStorage(type);
	if (!storage) return;

	try {
		storage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`[storage] Error writing key "${key}":`, error);
	}
};

/**
 * Remove a key from storage.
 *
 * @param key - Storage key
 * @param type - Storage type
 */
const removeStorageValue = (key: string, type: StorageType): void => {
	const storage = getStorage(type);
	if (!storage) return;

	storage.removeItem(key);
};

/* -------------------------------------------------------------------------- */
/*                              useStorage Hook                               */
/* -------------------------------------------------------------------------- */

/**
 * React Hook to synchronize state with localStorage or sessionStorage,
 * fully compatible with Server Components (SSR safe) and Client Components (CSR).
 *
 * Multi-tabs safe: Reacts to changes in other tabs/windows.
 *
 * @param key - Key name in storage
 * @param initialValue - Initial fallback value if none stored
 * @param storageType - "local" (default) or "session"
 *
 * @returns
 * - storedValue: Current value
 * - setValue: Function to update the value
 * - clearValue: Function to clear the value
 *
 * @example
 * const { storedValue, setValue, clearValue } = useStorage<string>("user-token", "", "local");
 *
 * setValue("new-token");
 * clearValue();
 */
export const useStorage = <T,>(key: string, initialValue: T, storageType: StorageType = 'local') => {
	const [storedValue, setStoredValue] = useState<T>(() => initialValue);
	/**
	 * Updates the storage and local state with a new value.
	 *
	 * @param value - New value to set
	 */
	const setValue = useCallback(
		(value: T) => {
			writeStorageValue(key, value, storageType);
			setStoredValue(value);
		},
		[key, storageType]
	);

	const clearValue = useCallback(() => {
		removeStorageValue(key, storageType);
		setStoredValue(initialValue);
	}, [key, initialValue, storageType]);

	//Synchronize state from storage on client-side mount, Hydrate on mount + react to changes
	useEffect(() => {
		const hydrate = () => {
			const latest = readStorageValue(key, initialValue, storageType);
			setStoredValue(latest);
		};

		hydrate();

		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === key && event.storageArea === getStorage(storageType)) {
				hydrate();
			}
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('storage', handleStorageChange);
		}

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('storage', handleStorageChange);
			}
		};
	}, [key, initialValue, storageType]);

	return { storedValue, setValue, clearValue } as const;
};
