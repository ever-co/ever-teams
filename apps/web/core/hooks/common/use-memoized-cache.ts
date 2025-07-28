import { useCallback, useRef } from 'react';

interface CacheEntry<T> {
	value: T;
	timestamp: number;
	dependencies: any[];
}

interface CacheOptions {
	maxAge?: number; // in milliseconds
	maxSize?: number;
}

/**
 * Advanced memoization hook with cache invalidation and size limits
 * Optimized for expensive computations in user-profile-tasks
 */
export function useMemoizedCache<T>(options: CacheOptions = {}) {
	const { maxAge = 5 * 60 * 1000, maxSize = 50 } = options; // 5 minutes default
	const cache = useRef(new Map<string, CacheEntry<T>>());

	const generateKey = useCallback((keyParts: any[]): string => {
		return keyParts
			.map((part) => {
				if (typeof part === 'object' && part !== null) {
					return JSON.stringify(part);
				}
				return String(part);
			})
			.join('|');
	}, []);

	const isValidEntry = useCallback(
		(entry: CacheEntry<T>, dependencies: any[]): boolean => {
			const now = Date.now();
			const isNotExpired = now - entry.timestamp < maxAge;
			const dependenciesMatch =
				entry.dependencies.length === dependencies.length &&
				entry.dependencies.every((dep, index) => {
					const currentDep = dependencies[index];
					// Deep comparison for objects, shallow for primitives
					if (typeof dep === 'object' && typeof currentDep === 'object') {
						return JSON.stringify(dep) === JSON.stringify(currentDep);
					}
					return dep === currentDep;
				});

			return isNotExpired && dependenciesMatch;
		},
		[maxAge]
	);

	const cleanupCache = useCallback(() => {
		const now = Date.now();
		const entries = Array.from(cache.current.entries());

		// Remove expired entries
		entries.forEach(([key, entry]) => {
			if (now - entry.timestamp >= maxAge) {
				cache.current.delete(key);
			}
		});

		// Remove oldest entries if cache is too large
		if (cache.current.size > maxSize) {
			const sortedEntries = entries
				.filter(([key]) => cache.current.has(key)) // Only existing entries
				.sort(([, a], [, b]) => a.timestamp - b.timestamp);

			const entriesToRemove = sortedEntries.slice(0, cache.current.size - maxSize);
			entriesToRemove.forEach(([key]) => cache.current.delete(key));
		}
	}, [maxAge, maxSize]);

	const memoize = useCallback(
		(computeFn: () => T, dependencies: any[], cacheKey?: string): T => {
			const key = cacheKey || generateKey(dependencies);
			const existingEntry = cache.current.get(key);

			if (existingEntry && isValidEntry(existingEntry, dependencies)) {
				return existingEntry.value;
			}

			// Compute new value
			const newValue = computeFn();
			const newEntry: CacheEntry<T> = {
				value: newValue,
				timestamp: Date.now(),
				dependencies: [...dependencies]
			};

			cache.current.set(key, newEntry);

			// Cleanup periodically
			if (cache.current.size > maxSize * 0.8) {
				cleanupCache();
			}

			return newValue;
		},
		[generateKey, isValidEntry, cleanupCache, maxSize]
	);

	const clearCache = useCallback(() => {
		cache.current.clear();
	}, []);

	const getCacheStats = useCallback(() => {
		return {
			size: cache.current.size,
			entries: Array.from(cache.current.keys())
		};
	}, []);

	return {
		memoize,
		clearCache,
		getCacheStats
	};
}

/**
 * Specialized hook for task filtering operations
 */
export function useTaskFilterCache() {
	const cache = useMemoizedCache<any>({
		maxAge: 2 * 60 * 1000, // 2 minutes for task data
		maxSize: 20
	});

	const memoizeTaskFilter = useCallback(
		<T>(filterFn: () => T, tasks: any[], filters: any, additionalDeps: any[] = []): T => {
			return cache.memoize(
				filterFn,
				[tasks.length, tasks[0]?.id, tasks[tasks.length - 1]?.id, filters, ...additionalDeps],
				`task-filter-${tasks.length}-${JSON.stringify(filters)}`
			);
		},
		[cache]
	);

	return {
		memoizeTaskFilter,
		clearCache: cache.clearCache,
		getCacheStats: cache.getCacheStats
	};
}
