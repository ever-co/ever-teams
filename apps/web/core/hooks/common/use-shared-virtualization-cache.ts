import { useCallback, useRef, useEffect } from 'react';

interface CacheItem<T> {
	data: T;
	renderedContent: React.ReactNode;
	lastAccessed: number;
	renderCount: number;
	instanceId: string;
}

interface SharedCacheMetrics {
	hits: number;
	misses: number;
	evictions: number;
	totalRequests: number;
	hitRate: number;
	instanceCount: number;
}

// Global shared cache instance
class SharedVirtualizationCache {
	private cache = new Map<string, CacheItem<any>>();
	private instances = new Set<string>();
	private maxSize: number;
	private ttl: number;
	private metrics: SharedCacheMetrics;

	constructor(maxSize = 200, ttl = 5 * 60 * 1000) {
		this.maxSize = maxSize;
		this.ttl = ttl;
		this.metrics = {
			hits: 0,
			misses: 0,
			evictions: 0,
			totalRequests: 0,
			hitRate: 0,
			instanceCount: 0
		};

		// Periodic cleanup
		setInterval(() => this.cleanupExpired(), Math.min(ttl / 2, 60000));
	}

	registerInstance(instanceId: string) {
		this.instances.add(instanceId);
		this.metrics.instanceCount = this.instances.size;
	}

	unregisterInstance(instanceId: string) {
		this.instances.delete(instanceId);
		this.metrics.instanceCount = this.instances.size;

		// Remove items from this instance
		for (const [key, item] of this.cache) {
			if (item.instanceId === instanceId) {
				this.cache.delete(key);
			}
		}
	}

	getCachedItem<T>(itemId: string): CacheItem<T> | null {
		const item = this.cache.get(itemId);

		this.metrics.totalRequests++;

		if (item) {
			// Update last accessed time
			item.lastAccessed = Date.now();
			item.renderCount++;
			this.metrics.hits++;
		} else {
			this.metrics.misses++;
		}

		this.metrics.hitRate =
			this.metrics.totalRequests > 0 ? (this.metrics.hits / this.metrics.totalRequests) * 100 : 0;

		return item || null;
	}

	setCachedItem<T>(itemId: string, data: T, renderedContent: React.ReactNode, instanceId: string) {
		// Cleanup expired items before adding new ones
		this.cleanupExpired();

		// Evict LRU if necessary
		if (this.cache.size >= this.maxSize) {
			this.evictLRU();
		}

		const cacheItem: CacheItem<T> = {
			data,
			renderedContent,
			lastAccessed: Date.now(),
			renderCount: 1,
			instanceId
		};

		this.cache.set(itemId, cacheItem);
	}

	private evictLRU() {
		let oldestKey = '';
		let oldestTime = Date.now();

		for (const [key, item] of this.cache) {
			if (item.lastAccessed < oldestTime) {
				oldestTime = item.lastAccessed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			this.metrics.evictions++;
		}
	}

	private cleanupExpired() {
		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, item] of this.cache) {
			if (now - item.lastAccessed > this.ttl) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach((key) => this.cache.delete(key));
		this.metrics.evictions += keysToDelete.length;
	}

	warmCache<T>(
		items: T[],
		visibleRange: { start: number; end: number },
		scrollDirection: 'up' | 'down' | 'idle',
		renderItem: (item: T, index: number) => React.ReactNode,
		instanceId: string
	) {
		const warmingSize = Math.min(10, Math.ceil((visibleRange.end - visibleRange.start) / 2));

		if (scrollDirection === 'down') {
			const startIndex = Math.min(visibleRange.end + 1, items.length - 1);
			const endIndex = Math.min(startIndex + warmingSize, items.length - 1);

			for (let i = startIndex; i <= endIndex; i++) {
				const item = items[i] as any;
				if (item?.id && !this.cache.has(item.id)) {
					const renderedContent = renderItem(item, i);
					this.setCachedItem(item.id, item, renderedContent, instanceId);
				}
			}
		} else if (scrollDirection === 'up') {
			const endIndex = Math.max(visibleRange.start - 1, 0);
			const startIndex = Math.max(endIndex - warmingSize, 0);

			for (let i = startIndex; i <= endIndex; i++) {
				const item = items[i] as any;
				if (item?.id && !this.cache.has(item.id)) {
					const renderedContent = renderItem(item, i);
					this.setCachedItem(item.id, item, renderedContent, instanceId);
				}
			}
		}
	}

	getMetrics(): SharedCacheMetrics {
		return { ...this.metrics };
	}

	getCacheStats() {
		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			utilizationRate: (this.cache.size / this.maxSize) * 100,
			metrics: this.metrics
		};
	}
}

// Global singleton instance
const globalCache = new SharedVirtualizationCache();

/**
 * Hook for shared virtualization cache across all instances
 * Improves performance by sharing cached items between different lists
 */
export function useSharedVirtualizationCache<T extends { id: string }>() {
	const instanceId = useRef(`cache-${Date.now()}-${Math.random()}`).current;

	// Register instance on mount
	useEffect(() => {
		globalCache.registerInstance(instanceId);

		return () => {
			globalCache.unregisterInstance(instanceId);
		};
	}, [instanceId]);

	const getCachedItem = useCallback((itemId: string) => {
		return globalCache.getCachedItem<T>(itemId);
	}, []);

	const setCachedItem = useCallback(
		(itemId: string, data: T, renderedContent: React.ReactNode) => {
			globalCache.setCachedItem(itemId, data, renderedContent, instanceId);
		},
		[instanceId]
	);

	const warmCache = useCallback(
		(
			items: T[],
			visibleRange: { start: number; end: number },
			scrollDirection: 'up' | 'down' | 'idle',
			renderItem: (item: T, index: number) => React.ReactNode
		) => {
			globalCache.warmCache(items, visibleRange, scrollDirection, renderItem, instanceId);
		},
		[instanceId]
	);

	const getCacheStats = useCallback(() => {
		return globalCache.getCacheStats();
	}, []);

	const getMetrics = useCallback(() => {
		return globalCache.getMetrics();
	}, []);

	return {
		getCachedItem,
		setCachedItem,
		warmCache,
		getCacheStats,
		getMetrics,
		instanceId
	};
}
