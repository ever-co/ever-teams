import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef, useMemo, useState } from 'react';

/**
 * Simple safety check for virtual items - minimal fix for the original error
 */
function isValidVirtualItem(virtualItem: any, itemsLength: number): boolean {
	return (
		virtualItem != null &&
		typeof virtualItem.index === 'number' &&
		virtualItem.index >= 0 &&
		virtualItem.index < itemsLength
	);
}

interface UseTanStackVirtualOptions {
	itemHeight: number;
	containerHeight: number;
	overscan?: number;
	enabled?: boolean;
}

/**
 * Optimized hook using TanStack Virtual for task lists
 * Provides better performance than custom virtualization solutions
 */
export function useTanStackVirtual<T>(items: T[], options: UseTanStackVirtualOptions) {
	const { itemHeight, containerHeight, overscan = 5, enabled = true } = options;

	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: enabled ? items.length : 0,
		getScrollElement: () => parentRef.current,
		estimateSize: () => itemHeight,
		overscan,
		enabled
	});

	// Get virtual items with their corresponding data - simple safety fix
	const virtualItems = virtualizer
		.getVirtualItems()
		.filter((virtualItem) => isValidVirtualItem(virtualItem, items.length))
		.map((virtualItem) => ({
			...virtualItem,
			item: items[virtualItem.index]
		}));

	// Scroll to specific item by index
	const scrollToIndex = useCallback(
		(index: number, align?: 'start' | 'center' | 'end') => {
			virtualizer.scrollToIndex(index, { align });
		},
		[virtualizer]
	);

	// Scroll to specific item by ID (assuming items have an id property)
	const scrollToItem = useCallback(
		(itemId: string, align?: 'start' | 'center' | 'end') => {
			const index = items.findIndex((item: any) => item.id === itemId);
			if (index !== -1) {
				scrollToIndex(index, align);
			}
		},
		[items, scrollToIndex]
	);

	// Get visible range information
	const getVisibleRange = useCallback(() => {
		const range = virtualizer.getVirtualItems();
		if (range.length === 0) return { start: 0, end: 0 };

		return {
			start: range[0].index,
			end: range[range.length - 1].index
		};
	}, [virtualizer]);

	// Container styles
	const containerStyle = {
		height: containerHeight,
		overflow: 'auto' as const
	};

	// Inner container styles (total height)
	const innerStyle = {
		height: virtualizer.getTotalSize(),
		width: '100%',
		position: 'relative' as const
	};

	return {
		parentRef,
		virtualItems,
		containerStyle,
		innerStyle,
		scrollToIndex,
		scrollToItem,
		getVisibleRange,
		totalSize: virtualizer.getTotalSize(),
		isScrolling: virtualizer.isScrolling,
		// Expose the raw virtualizer for advanced use cases
		virtualizer
	};
}

/**
 * Ultra-performant window-based virtualization for massive datasets
 * Uses the entire window as the scrollable container for maximum performance
 */
export function useWindowVirtual<T>(items: T[], options: { itemHeight: number; overscan?: number; enabled?: boolean }) {
	const { itemHeight, overscan = 2, enabled = true } = options;

	const virtualizer = useWindowVirtualizer({
		count: enabled ? items.length : 0,
		estimateSize: () => itemHeight,
		overscan,
		enabled
	});

	// Get virtual items with their corresponding data - simple safety fix
	const virtualItems = virtualizer
		.getVirtualItems()
		.filter((virtualItem) => isValidVirtualItem(virtualItem, items.length))
		.map((virtualItem) => ({
			...virtualItem,
			item: items[virtualItem.index]
		}));

	// Scroll to specific item by index with smooth behavior
	const scrollToIndex = useCallback(
		(index: number, align?: 'start' | 'center' | 'end') => {
			virtualizer.scrollToIndex(index, {
				align,
				behavior: 'smooth'
			});
		},
		[virtualizer]
	);

	// Scroll to specific item by ID
	const scrollToItem = useCallback(
		(itemId: string, align?: 'start' | 'center' | 'end') => {
			const index = items.findIndex((item: any) => item.id === itemId);
			if (index !== -1) {
				scrollToIndex(index, align);
			}
		},
		[items, scrollToIndex]
	);

	return {
		virtualItems,
		scrollToIndex,
		scrollToItem,
		totalSize: virtualizer.getTotalSize(),
		isScrolling: virtualizer.isScrolling,
		virtualizer
	};
}

/**
 * Enhanced virtualization hook with intelligent caching and performance optimizations
 * Prevents white spaces during fast scrolling and avoids re-virtualizing seen items
 */
export function useEnhancedVirtualization<T extends { id: string }>(
	items: T[],
	options: {
		containerHeight?: number;
		itemHeight: number;
		enabled?: boolean;
		useWindow?: boolean;
		cacheSize?: number;
		overscanMultiplier?: number;
	}
) {
	const {
		containerHeight = 600,
		itemHeight,
		enabled = true,
		useWindow = false,
		cacheSize = 50,
		overscanMultiplier = 2
	} = options;

	// FIXED: Cache data only, not React components to prevent memory leaks and stale closures
	const renderedItemsCacheRef = useRef<Map<string, T>>(new Map());
	const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'idle'>('idle');
	const [lastScrollTop, setLastScrollTop] = useState(0);

	// Dynamic overscan based on scroll speed and direction
	const dynamicOverscan = useMemo(() => {
		const baseOverscan = Math.max(3, Math.ceil(containerHeight / itemHeight / 4));
		return scrollDirection !== 'idle' ? baseOverscan * overscanMultiplier : baseOverscan;
	}, [scrollDirection, containerHeight, itemHeight, overscanMultiplier]);

	// Choose virtualization strategy
	const shouldUseWindow = useWindow || items.length > 100;

	// Enhanced scroll tracking
	const trackScrollDirection = useCallback(
		(scrollTop: number) => {
			const diff = scrollTop - lastScrollTop;
			if (Math.abs(diff) > 5) {
				// Threshold to avoid jitter
				setScrollDirection(diff > 0 ? 'down' : 'up');
			} else {
				setScrollDirection('idle');
			}
			setLastScrollTop(scrollTop);
		},
		[lastScrollTop]
	);

	// FIXED: Cache cleanup without dependency on cache state to prevent infinite re-renders
	const cleanupCache = useCallback(
		(visibleRange: { start: number; end: number }) => {
			// Simple validation
			if (!visibleRange || typeof visibleRange.start !== 'number' || typeof visibleRange.end !== 'number') {
				return;
			}

			const cache = renderedItemsCacheRef.current;
			if (!cache || cache.size <= cacheSize) {
				return;
			}

			const itemsToKeep = new Set<string>();

			// Keep items in extended range with bounds checking
			const extendedStart = Math.max(0, visibleRange.start - dynamicOverscan * 2);
			const extendedEnd = Math.min(items.length - 1, visibleRange.end + dynamicOverscan * 2);

			// Additional safety check for valid range
			if (extendedStart <= extendedEnd && extendedStart >= 0 && extendedEnd < items.length) {
				for (let i = extendedStart; i <= extendedEnd; i++) {
					const item = items[i];
					if (item && item.id) {
						itemsToKeep.add(item.id);
					}
				}
			}

			// Remove items not in extended range
			for (const [itemId] of cache) {
				if (!itemsToKeep.has(itemId)) {
					cache.delete(itemId);
				}
			}
		},
		[cacheSize, dynamicOverscan, items] // FIXED: Removed renderedItemsCache from dependencies
	);

	// Call both hooks unconditionally to comply with Rules of Hooks
	const windowResult = useWindowVirtual(items, {
		itemHeight,
		overscan: dynamicOverscan,
		enabled: enabled && items.length > 20 && shouldUseWindow
	});

	const containerResult = useTanStackVirtual(items, {
		itemHeight,
		containerHeight,
		overscan: dynamicOverscan,
		enabled: enabled && items.length > 20 && !shouldUseWindow
	});

	// Select which result to use based on shouldUseWindow
	const selectedResult = shouldUseWindow ? windowResult : containerResult;

	// Create getVisibleRange function based on selected result - simple fix
	const getVisibleRange = useCallback(() => {
		const range = selectedResult.virtualItems;
		if (!range || range.length === 0) return { start: 0, end: 0 };

		const firstItem = range[0];
		const lastItem = range[range.length - 1];

		if (!firstItem || !lastItem || typeof firstItem.index !== 'number' || typeof lastItem.index !== 'number') {
			return { start: 0, end: 0 };
		}

		return {
			start: firstItem.index,
			end: lastItem.index
		};
	}, [selectedResult.virtualItems]);

	// FIXED: Return cache ref and helper functions instead of state
	const getCachedItem = useCallback((itemId: string) => {
		return renderedItemsCacheRef.current.get(itemId);
	}, []);

	const setCachedItem = useCallback((itemId: string, item: T) => {
		renderedItemsCacheRef.current.set(itemId, item);
	}, []);

	const clearCache = useCallback(() => {
		renderedItemsCacheRef.current.clear();
	}, []);

	// Return the selected result merged with additional properties
	return {
		...selectedResult,
		getCachedItem,
		setCachedItem,
		clearCache,
		cacheSize: renderedItemsCacheRef.current.size,
		scrollDirection,
		trackScrollDirection,
		cleanupCache,
		getVisibleRange,
		isEnhanced: true
	};
}
