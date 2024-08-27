import { useEffect, useRef, useState } from 'react';

export function usePagination<T>(items: T[], defaultItemsPerPage = 10) {
	const [itemOffset, setItemOffset] = useState(0);
	const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

	const total = items.length;

	const endOffset = itemOffset + itemsPerPage;
	const currentItems = items.slice(itemOffset, endOffset);

	const onPageChange = (selectedItem: { selected: number }) => {
		const newOffset = (selectedItem.selected * itemsPerPage) % total;
		setItemOffset(newOffset);
	};

	return {
		total: items.length || 0,
		onPageChange,
		itemsPerPage,
		itemOffset,
		endOffset,
		setItemsPerPage,
		currentItems
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
	const [slicedItems, setSlicedItems] = useState(items.slice(0, defaultItemsPerPage));
	const [page, setPage] = useState(1);

	const $scrollableElement = useRef<HTMLElement | null>(null);

	$scrollableElement.current = scrollableElement || $scrollableElement.current;

	useEffect(() => {
		if (enabled) {
			setPage(1);
			setSlicedItems(items.slice(0, defaultItemsPerPage));
		}
	}, [enabled, items]);

	useEffect(() => {
		const container = $scrollableElement.current;
		if (!container || !enabled) return;

		const handleScroll = () => {
			if (
				container.scrollTop + container.clientHeight >=
				container.scrollHeight - 100 // Adjust this value for how close to the bottom you want to trigger loading
			) {
				setPage((prevPage) => prevPage + 1);
			}
		};

		container.addEventListener('scroll', handleScroll);

		return () => {
			container.removeEventListener('scroll', handleScroll);
		};
	}, [$scrollableElement.current, enabled]);

	useEffect(() => {
		const newItems = items.slice(0, defaultItemsPerPage * page);
		if (items.length > newItems.length) {
			setSlicedItems((prevItems) => (prevItems.length === newItems.length ? prevItems : newItems));
		}
	}, [page, items, defaultItemsPerPage]);

	return {
		slicedItems: enabled ? slicedItems : items,
		scrollableElement: $scrollableElement
	};
}
