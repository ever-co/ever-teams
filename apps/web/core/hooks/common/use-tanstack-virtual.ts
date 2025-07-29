import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef, useMemo, useState } from 'react';

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

	// Get virtual items with their corresponding data
	const virtualItems = virtualizer.getVirtualItems().map((virtualItem) => ({
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

	// Get virtual items with their corresponding data
	const virtualItems = virtualizer.getVirtualItems().map((virtualItem) => ({
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

	// Intelligent cache for rendered items
	const [renderedItemsCache, setRenderedItemsCache] = useState<Map<string, React.ReactNode>>(new Map());
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

	// Cache cleanup - remove items that are far from current view
	const cleanupCache = useCallback(
		(visibleRange: { start: number; end: number }) => {
			if (renderedItemsCache.size > cacheSize) {
				const newCache = new Map(renderedItemsCache);
				const itemsToKeep = new Set();

				// Keep items in extended range
				const extendedStart = Math.max(0, visibleRange.start - dynamicOverscan * 2);
				const extendedEnd = Math.min(items.length - 1, visibleRange.end + dynamicOverscan * 2);

				for (let i = extendedStart; i <= extendedEnd; i++) {
					if (items[i]) {
						itemsToKeep.add(items[i].id);
					}
				}

				// Remove items not in extended range
				for (const [itemId] of newCache) {
					if (!itemsToKeep.has(itemId)) {
						newCache.delete(itemId);
					}
				}

				setRenderedItemsCache(newCache);
			}
		},
		[renderedItemsCache, cacheSize, dynamicOverscan, items]
	);

	if (shouldUseWindow) {
		const windowResult = useWindowVirtual(items, {
			itemHeight,
			overscan: dynamicOverscan,
			enabled: enabled && items.length > 20
		});

		return {
			...windowResult,
			renderedItemsCache,
			setRenderedItemsCache,
			scrollDirection,
			trackScrollDirection,
			cleanupCache,
			getVisibleRange: () => {
				const range = windowResult.virtualItems;
				if (range.length === 0) return { start: 0, end: 0 };
				return {
					start: range[0].index,
					end: range[range.length - 1].index
				};
			},
			isEnhanced: true
		};
	}

	const containerResult = useTanStackVirtual(items, {
		itemHeight,
		containerHeight,
		overscan: dynamicOverscan,
		enabled: enabled && items.length > 20
	});

	return {
		...containerResult,
		renderedItemsCache,
		setRenderedItemsCache,
		scrollDirection,
		trackScrollDirection,
		cleanupCache,
		isEnhanced: true
	};
}

/**
 * Specialized hook for task list virtualization with TanStack Virtual
 * Automatically chooses between container and window virtualization
 * @deprecated Use useEnhancedVirtualization for better performance
 */
export function useTaskVirtualization<T>(
	tasks: T[],
	containerHeight: number = 600,
	itemHeight: number = 120,
	enabled: boolean = true,
	useWindow: boolean = false
) {
	// Use window virtualization for very large lists (>100 items)
	const shouldUseWindow = useWindow || tasks.length > 100;

	if (shouldUseWindow) {
		return useWindowVirtual(tasks, {
			itemHeight,
			overscan: 2,
			enabled: enabled && tasks.length > 20
		});
	}

	return useTanStackVirtual(tasks, {
		itemHeight,
		containerHeight,
		overscan: 3,
		enabled: enabled && tasks.length > 20
	});
}
