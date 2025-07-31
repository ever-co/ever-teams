import React, { memo, useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useEnhancedVirtualization } from '@/core/hooks/common/use-tanstack-virtual';
import { useSharedVirtualizationCache } from '@/core/hooks/common/use-shared-virtualization-cache';

/**
 * Optimized utility to safely check if virtualItem has positioning properties
 * Prevents TypeScript errors and runtime issues
 */
function hasPositionProperties(
	virtualItem: any
): virtualItem is { start: number; end: number; size: number; [key: string]: any } {
	return (
		virtualItem &&
		typeof virtualItem.start === 'number' &&
		typeof virtualItem.end === 'number' &&
		typeof virtualItem.size === 'number'
	);
}

interface VirtualizedListProps<T extends { id: string }> {
	items: T[];
	itemHeight: number;
	containerHeight?: number;
	useVirtualization?: boolean;
	useWindow?: boolean;
	className?: string;
	listClassName?: string;
	itemClassName?: string;
	renderItem: ((item: T, index?: number) => React.ReactNode) | ((item: T) => React.ReactNode);
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

	// Use window virtualization for very large datasets (100k+)
	const shouldUseWindowVirtualization = items.length > 100000;

	// Virtual pagination for extremely large datasets
	const virtualPageSize = useMemo(() => {
		if (items.length > 100000) return 10000; // 10k items per virtual page
		if (items.length > 50000) return 5000; // 5k items per virtual page
		if (items.length > 10000) return 2000; // 2k items per virtual page
		return items.length; // No pagination for smaller lists
	}, [items.length]);

	const [currentVirtualPage, setCurrentVirtualPage] = useState(0);

	// Calculate virtual pages for very large datasets
	const virtualizedItems = useMemo(() => {
		if (virtualPageSize >= items.length) return items;

		const startIndex = currentVirtualPage * virtualPageSize;
		const endIndex = Math.min(startIndex + virtualPageSize, items.length);
		return items.slice(startIndex, endIndex);
	}, [items, currentVirtualPage, virtualPageSize]);

	// Use enhanced virtualization with dynamic configuration
	const virtualizationConfig = useMemo(
		() => ({
			containerHeight,
			itemHeight,
			enabled: shouldVirtualize,
			useWindow: shouldUseWindowVirtualization || useWindow,
			cacheSize: useSmoothVirtualization ? cacheSize || 50 : 20,
			overscanMultiplier: useSmoothVirtualization ? overscanMultiplier || 2 : 1.5
		}),
		[
			containerHeight,
			itemHeight,
			shouldVirtualize,
			shouldUseWindowVirtualization,
			useWindow,
			useSmoothVirtualization,
			cacheSize,
			overscanMultiplier
		]
	);

	const virtualizationResult = useEnhancedVirtualization(virtualizedItems, virtualizationConfig);

	// Initialize shared cache system for enhanced performance
	const cache = useSharedVirtualizationCache<T>();

	// Wrapper function to handle both (item, index) and (item) signatures
	const renderItemWrapper = useCallback(
		(item: T, index: number) => {
			// Type assertion to handle both function signatures
			const render = renderItem;
			return render.length > 1 ? render(item, index) : render(item);
		},
		[renderItem]
	);

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

	// Enhanced scroll direction tracking with debouncing
	const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'idle'>('idle');
	const [lastScrollTop, setLastScrollTop] = useState(0);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const bufferCalculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Container virtualization hooks - moved to top level to comply with Rules of Hooks
	const bufferHeight = useMemo(() => itemHeight * bufferSize, [itemHeight, bufferSize]);

	// Enhanced buffer zones that adapt to scroll speed (async calculation)
	const [dynamicBufferHeight, setDynamicBufferHeight] = useState(bufferHeight);

	useEffect(() => {
		// Use requestAnimationFrame for non-blocking buffer calculations
		const calculateBuffer = () => {
			const baseBuffer = bufferHeight;
			const scrollSpeedMultiplier = scrollDirection !== 'idle' ? 1.5 : 1;
			const newBufferHeight = Math.min(baseBuffer * scrollSpeedMultiplier, itemHeight * 10);
			setDynamicBufferHeight(newBufferHeight);
		};

		requestAnimationFrame(calculateBuffer);
	}, [bufferHeight, scrollDirection, itemHeight]);

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

			// Debounced cache warming to avoid excessive calculations
			if (bufferCalculationTimeoutRef.current) {
				clearTimeout(bufferCalculationTimeoutRef.current);
			}

			bufferCalculationTimeoutRef.current = setTimeout(() => {
				if (
					useSmoothVirtualization &&
					'getVisibleRange' in virtualizationResult &&
					typeof virtualizationResult.getVisibleRange === 'function'
				) {
					try {
						const visibleRange = virtualizationResult.getVisibleRange();
						if (
							visibleRange &&
							typeof visibleRange.start === 'number' &&
							typeof visibleRange.end === 'number'
						) {
							cache.warmCache(virtualizedItems, visibleRange, scrollDirection, renderItemWrapper);

							// Auto-pagination for very large datasets
							if (virtualPageSize < items.length) {
								const totalVirtualizedItems = virtualizedItems.length;
								const nearEndThreshold = totalVirtualizedItems * 0.8; // 80% threshold

								if (visibleRange.end > nearEndThreshold) {
									const nextPage = currentVirtualPage + 1;
									const maxPage = Math.ceil(items.length / virtualPageSize) - 1;

									if (nextPage <= maxPage) {
										// Lazy load next virtual page
										requestAnimationFrame(() => {
											setCurrentVirtualPage(nextPage);
										});
									}
								}
							}
						}
					} catch (error) {
						console.warn('VirtualizedList: Error getting visible range:', error);
					}
				}
			}, 50); // 50ms debounce for cache warming

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

	// Cleanup effect for timeouts
	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
			if (bufferCalculationTimeoutRef.current) {
				clearTimeout(bufferCalculationTimeoutRef.current);
			}
		};
	}, []);

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

			// Render new item using wrapper
			const renderedItem = renderItemWrapper(item, index);

			// Cache the rendered item for future use
			if (useSmoothVirtualization) {
				cache.setCachedItem(itemId, item, renderedItem);
			}

			// Simple rendering with original styles
			const itemStyle = hasPositionProperties(virtualItem)
				? {
						position: 'absolute' as const,
						top: 0,
						left: 0,
						width: '100%',
						height: `${virtualItem.size}px`,
						transform: `translateY(${virtualItem.start}px)`,
						transition: isScrolling ? 'none' : 'transform 0.1s ease-out',
						willChange: isScrolling ? 'transform' : 'auto'
					}
				: {
						// Fallback for items without positioning (window virtualization)
						position: 'relative' as const,
						width: '100%',
						minHeight: `${itemHeight}px`
					};

			return (
				<div key={virtualItem.key} style={itemStyle}>
					{/* Preserve original spacing structure like TanStackVirtualizedTaskList */}
					<div className={itemClassName || 'px-1 pb-4'}>{renderedItem}</div>
				</div>
			);
		},
		[renderItem, itemClassName, isScrolling, useSmoothVirtualization, cache, itemHeight]
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
							{renderItemWrapper(item, index)}
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
	// (hooks moved to top level to comply with Rules of Hooks)

	return (
		<div className={className}>
			<div ref={parentRef} style={containerStyle} className="custom-scrollbar" onScroll={handleScroll}>
				<div style={innerStyle}>
					{/* Enhanced top buffer - adapts to scroll direction */}
					{(() => {
						const firstItem = virtualItems[0];
						return virtualItems.length > 0 && hasPositionProperties(firstItem) && firstItem.start > 0 ? (
							<div
								style={{
									position: 'absolute',
									top: Math.max(0, firstItem.start - dynamicBufferHeight),
									left: 0,
									width: '100%',
									height: Math.min(dynamicBufferHeight, firstItem.start),
									background: 'transparent',
									pointerEvents: 'none',
									// Subtle gradient to blend with content
									backgroundImage:
										scrollDirection === 'down'
											? 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)'
											: 'transparent'
								}}
							/>
						) : null;
					})()}

					{virtualItems.map((virtualItem, index) => renderVirtualizedItem(virtualItem, index))}

					{/* Enhanced bottom buffer - adapts to scroll direction */}
					{(() => {
						const lastItem = virtualItems[virtualItems.length - 1];
						return virtualItems.length > 0 &&
							hasPositionProperties(lastItem) &&
							lastItem.end < totalSize ? (
							<div
								style={{
									position: 'absolute',
									top: lastItem.end,
									left: 0,
									width: '100%',
									height: Math.min(dynamicBufferHeight, totalSize - lastItem.end),
									background: 'transparent',
									pointerEvents: 'none',
									// Subtle gradient to blend with content
									backgroundImage:
										scrollDirection === 'up'
											? 'linear-gradient(to top, rgba(255,255,255,0.02), transparent)'
											: 'transparent'
								}}
							/>
						) : null;
					})()}
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
						{virtualPageSize < items.length && (
							<div className="mt-1">
								Page: {currentVirtualPage + 1}/{Math.ceil(items.length / virtualPageSize)}
							</div>
						)}
					</div>
				)}

				{/* Virtual pagination indicator for large datasets */}
				{virtualPageSize < items.length && (
					<div className="absolute bottom-2 left-2 z-10 px-2 py-1 text-xs text-white rounded bg-blue-600/80">
						Showing {virtualizedItems.length.toLocaleString()} of {items.length.toLocaleString()} items
					</div>
				)}
			</div>
		</div>
	);
}) as <T extends { id: string }>(props: VirtualizedListProps<T>) => React.ReactElement;

(VirtualizedList as any).displayName = 'VirtualizedList';
