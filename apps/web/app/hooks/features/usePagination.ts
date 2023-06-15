import { useState } from 'react';

export function usePagination<T>(items: T[], defaultItemsPerPage: number = 10) {
	const [itemOffset, setItemOffset] = useState(0);
	const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

	const total = items.length;

	const endOffset = itemOffset + itemsPerPage;
	const currentItems = items?.slice(itemOffset, endOffset);

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
		currentItems,
	};
}
