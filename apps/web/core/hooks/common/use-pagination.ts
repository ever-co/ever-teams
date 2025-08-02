import { useEffect, useRef, useState } from 'react';

interface UsePaginationProps<T> {
	items: T[];
	defaultItemsPerPage?: number;
}

export function usePagination<T>({ items, defaultItemsPerPage = 5 }: UsePaginationProps<T>) {
	const [itemOffset, setItemOffset] = useState(0);
	const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

	// Total number of items
	const total = items?.length || 0;

	// Calculate end offset based on items per page from dropdown
	const endOffset = Math.min(itemOffset + itemsPerPage, total);

	// Get current items to display based on itemsPerPage selection
	const currentItems = items?.slice(itemOffset, endOffset) || [];

	// Calculate page count based on itemsPerPage selection
	const pageCount = Math.ceil(total / itemsPerPage);

	// Handle page change
	const onPageChange = (selectedItem: { selected: number }) => {
		const newOffset = total === 0 ? 0 : (selectedItem.selected * itemsPerPage) % total;
		setItemOffset(newOffset);
	};

	// Reset to first page when changing items per page
	useEffect(() => {
		setItemOffset(0);
	}, [itemsPerPage]);

	return {
		total,
		onPageChange,
		itemsPerPage,
		itemOffset,
		endOffset,
		setItemsPerPage,
		currentItems,
		setItemOffset,
		pageCount
	};
}
export function useScrollPagination<T>({
	enabled,
	defaultItemsPerPage = 10,
	items,
	scrollableElement
}: {
	items: T[];
	enabled?: boolean;
	defaultItemsPerPage?: number;
	scrollableElement?: HTMLElement | null;
}) {
	const [slicedItems, setSlicedItems] = useState<T[]>([]);
	const [page, setPage] = useState(1);
	const [isInitialized, setIsInitialized] = useState(false);

	const $scrollableElement = useRef<HTMLElement | null>(null);
	const itemsRef = useRef<T[]>([]);

	$scrollableElement.current = scrollableElement || $scrollableElement.current;

	const SCROLL_THRESHOLD = 100;

	// Initialize or reset when items change significantly
	useEffect(() => {
		if (enabled) {
			// Only reset if items array reference changed or length changed significantly
			const shouldReset =
				!isInitialized || itemsRef.current !== items || Math.abs(itemsRef.current.length - items.length) > 0;

			if (shouldReset) {
				setPage(1);
				setSlicedItems(items.slice(0, defaultItemsPerPage));
				itemsRef.current = items;
				setIsInitialized(true);
			}
		} else {
			setIsInitialized(false);
		}
	}, [enabled, items, defaultItemsPerPage, isInitialized]);

	// Handle scroll events with throttling
	useEffect(() => {
		const container = $scrollableElement.current;
		if (!container || !enabled) return;

		let isScrolling = false;

		const handleScroll = () => {
			if (isScrolling) return;

			isScrolling = true;
			requestAnimationFrame(() => {
				if (container.scrollTop + container.clientHeight >= container.scrollHeight - SCROLL_THRESHOLD) {
					setPage((prevPage) => prevPage + 1);
				}
				isScrolling = false;
			});
		};

		container.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			container.removeEventListener('scroll', handleScroll);
		};
	}, [enabled, $scrollableElement.current]);

	// Update sliced items when page changes
	useEffect(() => {
		if (!enabled || !isInitialized) return;

		const maxItems = defaultItemsPerPage * page;
		const newItems = items.slice(0, maxItems);

		// Only update if we actually have more items to show
		if (newItems.length > slicedItems.length && newItems.length <= items.length) {
			setSlicedItems(newItems);
		}
	}, [page, items, defaultItemsPerPage, enabled, isInitialized, slicedItems.length]);

	return {
		slicedItems: enabled ? slicedItems : items,
		scrollableElement: $scrollableElement
	};
}
