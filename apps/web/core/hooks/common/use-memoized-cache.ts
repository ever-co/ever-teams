import { useCallback, useRef } from 'react';
import { isEqual } from 'lodash';
import { TTask } from '@/core/types/schemas/task/task.schema';
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
			.map((part, index) => {
				if (typeof part === 'object' && part !== null) {
					// Use a more efficient hash for objects instead of JSON.stringify
					return `obj_${index}_${Object.keys(part).length}_${typeof part.id !== 'undefined' ? part.id : 'noId'}`;
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
					// Use lodash isEqual for deep comparison - much more efficient than JSON.stringify
					if (typeof dep === 'object' && typeof currentDep === 'object') {
						return isEqual(dep, currentDep);
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
 * Specialized hook for task filtering operations with ultra cache
 */
export function useTaskFilterCache<T>() {
	const cache = useMemoizedCache<any>({
		maxAge: 5 * 60 * 1000, // 5 minutes for task data
		maxSize: 100 // Increased cache size
	});

	const memoizeTaskFilter = useCallback(
		<T>(filterFn: () => T, tasks: TTask[], filters: any, additionalDeps: any[] = []): T => {
			// Create more intelligent cache key
			const taskSignature =
				tasks.length > 0
					? {
							length: tasks.length,
							firstId: tasks[0]?.id,
							lastId: tasks[tasks.length - 1]?.id,
							checksum: tasks
								.slice(0, 5)
								.map((t) => t.id)
								.join(',') // Sample checksum
						}
					: { length: 0 };

			// Create efficient cache key without expensive JSON.stringify
			const filterKeys = Object.keys(filters || {})
				.sort()
				.join(',');
			const cacheKey = `task-filter-${taskSignature.length}-${filterKeys}-${Object.keys(filters || {}).length}`;

			return cache.memoize(filterFn, [taskSignature, filters, ...additionalDeps], cacheKey);
		},
		[cache]
	);

	// Batch clear for related filters
	const clearRelatedFilters = useCallback(() => {
		// Clear all caches (could be extended to clear specific filter types)
		cache.clearCache();
	}, [cache]);

	return {
		memoizeTaskFilter,
		clearCache: cache.clearCache,
		clearRelatedFilters,
		getCacheStats: cache.getCacheStats
	};
}
