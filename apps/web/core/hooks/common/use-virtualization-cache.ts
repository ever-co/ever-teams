import { useCallback, useRef, useState, useEffect } from 'react';

interface CacheItem<T> {
	data: T;
	renderedContent: React.ReactNode;
	lastAccessed: number;
	renderCount: number;
}

interface VirtualizationCacheOptions {
	maxSize: number;
	ttl?: number; // Time to live in milliseconds
	enableMetrics?: boolean;
}

interface CacheMetrics {
	hits: number;
	misses: number;
	evictions: number;
	totalRequests: number;
	hitRate: number;
}

/**
 * Intelligent caching system for virtualized lists
 * Prevents re-rendering of previously seen items and optimizes memory usage
 */
export function useVirtualizationCache<T extends { id: string }>(
	options: VirtualizationCacheOptions = { maxSize: 100 }
) {
	const { maxSize, ttl = 5 * 60 * 1000, enableMetrics = false } = options; // 5 minutes default TTL

	const cache = useRef<Map<string, CacheItem<T>>>(new Map());
	const [metrics, setMetrics] = useState<CacheMetrics>({
		hits: 0,
		misses: 0,
		evictions: 0,
		totalRequests: 0,
		hitRate: 0
	});

	// LRU eviction strategy
	const evictLRU = useCallback(() => {
		if (cache.current.size <= maxSize) return;

		let oldestKey = '';
		let oldestTime = Date.now();

		for (const [key, item] of cache.current) {
			if (item.lastAccessed < oldestTime) {
				oldestTime = item.lastAccessed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			cache.current.delete(oldestKey);
			if (enableMetrics) {
				setMetrics(prev => ({
					...prev,
					evictions: prev.evictions + 1
				}));
			}
		}
	}, [maxSize, enableMetrics]);

	// TTL cleanup
	const cleanupExpired = useCallback(() => {
		if (!ttl) return;

		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, item] of cache.current) {
			if (now - item.lastAccessed > ttl) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach(key => cache.current.delete(key));

		if (enableMetrics && keysToDelete.length > 0) {
			setMetrics(prev => ({
				...prev,
				evictions: prev.evictions + keysToDelete.length
			}));
		}
	}, [ttl, enableMetrics]);

	// Get item from cache
	const getCachedItem = useCallback((itemId: string): CacheItem<T> | null => {
		const item = cache.current.get(itemId);
		
		if (enableMetrics) {
			setMetrics(prev => {
				const newTotalRequests = prev.totalRequests + 1;
				const newHits = item ? prev.hits + 1 : prev.hits;
				const newMisses = item ? prev.misses : prev.misses + 1;
				
				return {
					...prev,
					hits: newHits,
					misses: newMisses,
					totalRequests: newTotalRequests,
					hitRate: newTotalRequests > 0 ? (newHits / newTotalRequests) * 100 : 0
				};
			});
		}

		if (item) {
			// Update last accessed time
			item.lastAccessed = Date.now();
			item.renderCount++;
			return item;
		}

		return null;
	}, [enableMetrics]);

	// Set item in cache
	const setCachedItem = useCallback((itemId: string, data: T, renderedContent: React.ReactNode) => {
		// Cleanup expired items before adding new ones
		cleanupExpired();

		// Evict LRU if necessary
		if (cache.current.size >= maxSize) {
			evictLRU();
		}

		const cacheItem: CacheItem<T> = {
			data,
			renderedContent,
			lastAccessed: Date.now(),
			renderCount: 1
		};

		cache.current.set(itemId, cacheItem);
	}, [maxSize, evictLRU, cleanupExpired]);

	// Check if item exists in cache
	const hasCachedItem = useCallback((itemId: string): boolean => {
		return cache.current.has(itemId);
	}, []);

	// Remove specific item from cache
	const removeCachedItem = useCallback((itemId: string): boolean => {
		return cache.current.delete(itemId);
	}, []);

	// Clear entire cache
	const clearCache = useCallback(() => {
		cache.current.clear();
		if (enableMetrics) {
			setMetrics({
				hits: 0,
				misses: 0,
				evictions: 0,
				totalRequests: 0,
				hitRate: 0
			});
		}
	}, [enableMetrics]);

	// Get cache statistics
	const getCacheStats = useCallback(() => {
		return {
			size: cache.current.size,
			maxSize,
			utilizationRate: (cache.current.size / maxSize) * 100,
			metrics: enableMetrics ? metrics : null
		};
	}, [maxSize, enableMetrics, metrics]);

	// Preload items into cache (useful for predictive loading)
	const preloadItems = useCallback((items: Array<{ id: string; data: T; renderedContent: React.ReactNode }>) => {
		items.forEach(({ id, data, renderedContent }) => {
			if (!cache.current.has(id)) {
				setCachedItem(id, data, renderedContent);
			}
		});
	}, [setCachedItem]);

	// Bulk remove items from cache
	const removeBulkItems = useCallback((itemIds: string[]) => {
		let removedCount = 0;
		itemIds.forEach(id => {
			if (cache.current.delete(id)) {
				removedCount++;
			}
		});
		return removedCount;
	}, []);

	// Periodic cleanup effect
	useEffect(() => {
		if (!ttl) return;

		const interval = setInterval(cleanupExpired, Math.min(ttl / 2, 60000)); // Cleanup every 30s or half TTL
		return () => clearInterval(interval);
	}, [ttl, cleanupExpired]);

	// Smart cache warming based on scroll direction and visible range
	const warmCache = useCallback((
		items: T[],
		visibleRange: { start: number; end: number },
		scrollDirection: 'up' | 'down' | 'idle',
		renderItem: (item: T, index: number) => React.ReactNode
	) => {
		const warmingSize = Math.min(10, Math.ceil((visibleRange.end - visibleRange.start) / 2));
		
		if (scrollDirection === 'down') {
			// Pre-render items below visible range
			const startIndex = Math.min(visibleRange.end + 1, items.length - 1);
			const endIndex = Math.min(startIndex + warmingSize, items.length - 1);
			
			for (let i = startIndex; i <= endIndex; i++) {
				const item = items[i];
				if (item && !hasCachedItem(item.id)) {
					const renderedContent = renderItem(item, i);
					setCachedItem(item.id, item, renderedContent);
				}
			}
		} else if (scrollDirection === 'up') {
			// Pre-render items above visible range
			const endIndex = Math.max(visibleRange.start - 1, 0);
			const startIndex = Math.max(endIndex - warmingSize, 0);
			
			for (let i = startIndex; i <= endIndex; i++) {
				const item = items[i];
				if (item && !hasCachedItem(item.id)) {
					const renderedContent = renderItem(item, i);
					setCachedItem(item.id, item, renderedContent);
				}
			}
		}
	}, [hasCachedItem, setCachedItem]);

	return {
		getCachedItem,
		setCachedItem,
		hasCachedItem,
		removeCachedItem,
		clearCache,
		getCacheStats,
		preloadItems,
		removeBulkItems,
		warmCache,
		metrics: enableMetrics ? metrics : null
	};
}
