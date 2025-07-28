import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef } from 'react';

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
export function useTanStackVirtual<T>(
	items: T[],
	options: UseTanStackVirtualOptions
) {
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
	const scrollToIndex = useCallback((index: number, align?: 'start' | 'center' | 'end') => {
		virtualizer.scrollToIndex(index, { align });
	}, [virtualizer]);

	// Scroll to specific item by ID (assuming items have an id property)
	const scrollToItem = useCallback((itemId: string, align?: 'start' | 'center' | 'end') => {
		const index = items.findIndex((item: any) => item.id === itemId);
		if (index !== -1) {
			scrollToIndex(index, align);
		}
	}, [items, scrollToIndex]);

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
		overflow: 'auto' as const,
	};

	// Inner container styles (total height)
	const innerStyle = {
		height: virtualizer.getTotalSize(),
		width: '100%',
		position: 'relative' as const,
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
 * Specialized hook for task list virtualization with TanStack Virtual
 */
export function useTaskVirtualization<T>(
	tasks: T[],
	containerHeight: number = 600,
	itemHeight: number = 120,
	enabled: boolean = true
) {
	return useTanStackVirtual(tasks, {
		itemHeight,
		containerHeight,
		overscan: 3, // Render 3 extra items above and below visible area
		enabled: enabled && tasks.length > 20 // Only enable for large lists
	});
}
