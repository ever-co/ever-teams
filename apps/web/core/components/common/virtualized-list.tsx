import React, { memo, useCallback, useState, useMemo } from 'react';
import { useEnhancedVirtualization } from '@/core/hooks/common/use-tanstack-virtual';
import { useVirtualizationCache } from '@/core/hooks/common/use-virtualization-cache';

interface VirtualizedListProps<T extends { id: string }> {
	items: T[];
	itemHeight: number;
	containerHeight?: number;
	useVirtualization?: boolean;
	useWindow?: boolean;
	className?: string;
	listClassName?: string;
	itemClassName?: string;
	renderItem: (item: T, index: number) => React.ReactNode;
	renderEmpty?: () => React.ReactNode;
	loadingIndicator?: React.ReactNode;
	scrollingIndicator?: React.ReactNode;
	onScroll?: (scrollTop: number) => void;
	overscanMultiplier?: number;
	cacheSize?: number;
	// Preserve original parent-child structure
	preserveListStructure?: boolean;
	listTag?: 'ul' | 'ol' | 'div';
	itemTag?: 'li' | 'div';
	// Enhanced smooth virtualization
	useSmoothVirtualization?: boolean;
	bufferSize?: number;
	smoothScrolling?: boolean;
}

/**
 * Enhanced VirtualizedList component that preserves original CSS styling
 * and provides smooth scrolling without white spaces
 */
export const VirtualizedList = memo(<T extends { id: string }>(props: VirtualizedListProps<T>) => {
	const {
		items,
		itemHeight,
		containerHeight = 600,
		useVirtualization = true,
		useWindow = false,
		className,
		listClassName,
		itemClassName,
		renderItem,
		renderEmpty,
		scrollingIndicator,
		onScroll,
		overscanMultiplier = 2,
		cacheSize = 50,
		listTag = 'ul',
		itemTag = 'li',
		useSmoothVirtualization = false,
		bufferSize = 5
	} = props;

	// Don't use virtualization for small lists or when disabled
	const shouldVirtualize = useVirtualization && items.length > 20;

	// Use enhanced virtualization for better performance and cache
	const virtualizationResult = useSmoothVirtualization
		? useEnhancedVirtualization(items, {
				containerHeight,
				itemHeight,
				enabled: shouldVirtualize,
				useWindow,
				cacheSize: cacheSize || 50,
				overscanMultiplier: overscanMultiplier || 2
			})
		: useEnhancedVirtualization(items, {
				containerHeight,
				itemHeight,
				enabled: shouldVirtualize,
				useWindow,
				cacheSize: 20, // Smaller cache for basic mode
				overscanMultiplier: 1.5
			});

	// Initialize cache system for enhanced performance
	const cache = useVirtualizationCache<T>({
		maxSize: cacheSize || 50,
		enableMetrics: true
	});

	// Extract properties safely
	const parentRef = 'parentRef' in virtualizationResult ? virtualizationResult.parentRef : null;
	const virtualItems = virtualizationResult.virtualItems || [];
	const totalSize = virtualizationResult.totalSize || 0;
	const isScrolling = virtualizationResult.isScrolling || false;

	// Handle different virtualization types
	const containerStyle =
		'containerStyle' in virtualizationResult
			? virtualizationResult.containerStyle
			: { height: containerHeight, overflow: 'auto' as const };

	const innerStyle =
		'innerStyle' in virtualizationResult
			? virtualizationResult.innerStyle
			: { height: totalSize, width: '100%', position: 'relative' as const };

	// Enhanced scroll direction tracking
	const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'idle'>('idle');
	const [lastScrollTop, setLastScrollTop] = useState(0);

	// Handle scroll events with enhanced tracking
	const handleScroll = useCallback(
		(event: React.UIEvent<HTMLDivElement>) => {
			const scrollTop = event.currentTarget.scrollTop;

			// Track scroll direction for cache optimization
			const diff = scrollTop - lastScrollTop;
			if (Math.abs(diff) > 5) {
				setScrollDirection(diff > 0 ? 'down' : 'up');
			} else {
				setScrollDirection('idle');
			}
			setLastScrollTop(scrollTop);

			// Enhanced virtualization scroll tracking
			if (
				useSmoothVirtualization &&
				'trackScrollDirection' in virtualizationResult &&
				typeof virtualizationResult.trackScrollDirection === 'function'
			) {
				(virtualizationResult.trackScrollDirection as (scrollTop: number) => void)(scrollTop);
			}

			// Cache warming based on scroll direction
			if (useSmoothVirtualization && 'getVisibleRange' in virtualizationResult) {
				const visibleRange = virtualizationResult.getVisibleRange();
				cache.warmCache(items, visibleRange, scrollDirection, renderItem);
			}

			if (onScroll) {
				onScroll(scrollTop);
			}
		},
		[
			lastScrollTop,
			onScroll,
			useSmoothVirtualization,
			virtualizationResult,
			cache,
			items,
			scrollDirection,
			renderItem
		]
	);

	// Enhanced render function that preserves CSS structure like TanStackVirtualizedTaskList
	const renderVirtualizedItem = useCallback(
		(virtualItem: any, index: number) => {
			const item = virtualItem.item;
			const itemId = item.id;

			// Try cache first for enhanced performance
			if (useSmoothVirtualization) {
				const cachedItem = cache.getCachedItem(itemId);
				if (cachedItem) {
					return (
						<div
							key={virtualItem.key}
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`,
								transition: isScrolling ? 'none' : 'transform 0.1s ease-out',
								willChange: isScrolling ? 'transform' : 'auto'
							}}
						>
							{/* Preserve original spacing structure like TanStackVirtualizedTaskList */}
							<div className={itemClassName || 'px-1 pb-4'}>{cachedItem.renderedContent}</div>
						</div>
					);
				}
			}

			// Render new item
			const renderedItem = renderItem(item, index);

			// Cache the rendered item for future use
			if (useSmoothVirtualization) {
				cache.setCachedItem(itemId, item, renderedItem);
			}

			return (
				<div
					key={virtualItem.key}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: `${virtualItem.size}px`,
						transform: `translateY(${virtualItem.start}px)`,
						transition: isScrolling ? 'none' : 'transform 0.1s ease-out',
						willChange: isScrolling ? 'transform' : 'auto'
					}}
				>
					{/* Preserve original spacing structure like TanStackVirtualizedTaskList */}
					<div className={itemClassName || 'px-1 pb-4'}>{renderedItem}</div>
				</div>
			);
		},
		[renderItem, itemClassName, isScrolling, useSmoothVirtualization, cache]
	);

	// Non-virtualized rendering for small lists - preserves original structure
	if (!shouldVirtualize) {
		if (items.length === 0) {
			return renderEmpty ? <>{renderEmpty()}</> : null;
		}

		const ListComponent = listTag as any;
		const ItemComponent = itemTag as any;

		// Always preserve list structure for non-virtualized lists
		return (
			<div className={className}>
				<ListComponent className={listClassName}>
					{items.map((item, index) => (
						<ItemComponent key={item.id} className={itemClassName}>
							{renderItem(item, index)}
						</ItemComponent>
					))}
				</ListComponent>
			</div>
		);
	}

	// Empty state
	if (items.length === 0) {
		return renderEmpty ? <>{renderEmpty()}</> : null;
	}

	// Window virtualization
	if (useWindow) {
		return (
			<div className={className}>
				<div style={{ height: totalSize, position: 'relative' }}>
					{virtualItems.map((virtualItem, index) => renderVirtualizedItem(virtualItem, index))}
					{isScrolling && scrollingIndicator && (
						<div className="fixed top-2 right-2 z-50 px-2 py-1 text-xs text-white rounded bg-black/50">
							{scrollingIndicator}
						</div>
					)}
					{isScrolling && !scrollingIndicator && (
						<div className="fixed top-2 right-2 z-50 px-2 py-1 text-xs text-white rounded bg-black/50">
							Scrolling {scrollDirection}...
						</div>
					)}
				</div>
			</div>
		);
	}

	// Container virtualization with enhanced anti-white-space system
	const bufferHeight = useMemo(() => itemHeight * bufferSize, [itemHeight, bufferSize]);

	// Enhanced buffer zones that adapt to scroll speed
	const dynamicBufferHeight = useMemo(() => {
		const baseBuffer = bufferHeight;
		const scrollSpeedMultiplier = scrollDirection !== 'idle' ? 1.5 : 1;
		return Math.min(baseBuffer * scrollSpeedMultiplier, itemHeight * 10); // Max 10 items buffer
	}, [bufferHeight, scrollDirection, itemHeight]);

	return (
		<div className={className}>
			<div ref={parentRef} style={containerStyle} className="custom-scrollbar" onScroll={handleScroll}>
				<div style={innerStyle}>
					{/* Enhanced top buffer - adapts to scroll direction */}
					{virtualItems.length > 0 && virtualItems[0].start > 0 && (
						<div
							style={{
								position: 'absolute',
								top: Math.max(0, virtualItems[0].start - dynamicBufferHeight),
								left: 0,
								width: '100%',
								height: Math.min(dynamicBufferHeight, virtualItems[0].start),
								background: 'transparent',
								pointerEvents: 'none',
								// Subtle gradient to blend with content
								backgroundImage:
									scrollDirection === 'down'
										? 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)'
										: 'transparent'
							}}
						/>
					)}

					{virtualItems.map((virtualItem, index) => renderVirtualizedItem(virtualItem, index))}

					{/* Enhanced bottom buffer - adapts to scroll direction */}
					{virtualItems.length > 0 && virtualItems[virtualItems.length - 1].end < totalSize && (
						<div
							style={{
								position: 'absolute',
								top: virtualItems[virtualItems.length - 1].end,
								left: 0,
								width: '100%',
								height: Math.min(
									dynamicBufferHeight,
									totalSize - virtualItems[virtualItems.length - 1].end
								),
								background: 'transparent',
								pointerEvents: 'none',
								// Subtle gradient to blend with content
								backgroundImage:
									scrollDirection === 'up'
										? 'linear-gradient(to top, rgba(255,255,255,0.02), transparent)'
										: 'transparent'
							}}
						/>
					)}
				</div>

				{/* Enhanced scroll indicator */}
				{isScrolling && scrollingIndicator && (
					<div className="absolute top-2 right-2 z-10 px-2 py-1 text-xs text-white rounded bg-black/50">
						{scrollingIndicator}
					</div>
				)}
				{isScrolling && !scrollingIndicator && (
					<div className="absolute top-2 right-2 z-10 px-2 py-1 text-xs text-white rounded bg-black/50">
						<div className="flex gap-2 items-center">
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
							<span>Scrolling {scrollDirection}...</span>
						</div>
					</div>
				)}

				{/* Cache performance indicator (dev mode) */}
				{useSmoothVirtualization && process.env.NODE_ENV === 'development' && (
					<div className="absolute right-2 bottom-2 z-10 px-2 py-1 text-xs text-white rounded bg-green-600/80">
						Cache: {cache.getCacheStats().size}/{cache.getCacheStats().maxSize}
					</div>
				)}
			</div>
		</div>
	);
}) as <T extends { id: string }>(props: VirtualizedListProps<T>) => React.ReactElement;

(VirtualizedList as any).displayName = 'VirtualizedList';
