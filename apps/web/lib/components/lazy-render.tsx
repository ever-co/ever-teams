import React, { ReactNode, useEffect, useRef, useState } from 'react';

type Props<T> = {
	items: T[];
	children?: (item: T, index: number) => ReactNode;
	itemsPerPage?: number;
};

/**
 * Lazy Render based on
 * Queues the render function to be called during a browser's idle periods.
 * @param param0
 * @returns
 */
export function LazyRender<T extends object>({ items, children, itemsPerPage = 10 }: Props<T>) {
	const itemsRef = useRef(items);
	const [slicedItems, setSlicedItems] = useState<T[]>([]);
	const [page, setPage] = useState(1);

	useEffect(() => {
		if (!('requestIdleCallback' in window)) {
			setSlicedItems(items);
			return;
		}

		if (itemsRef.current !== items && page > 1) {
			itemsRef.current = items;
			setPage(1);
			return;
		}

		let cancelableIdlCallback = requestIdleCallback(function callback(deadline) {
			console.log('Called Lazy Render');
			if (deadline.timeRemaining() < 1) {
				cancelableIdlCallback = requestIdleCallback(callback);
				return;
			}

			const newItems = items.slice(0, itemsPerPage * page);

			setSlicedItems((prevItems) =>
				prevItems.length === newItems.length && itemsRef.current === items ? prevItems : newItems
			);

			itemsRef.current = items;

			if (items.length > newItems.length) {
				// Increment the page to trigger the next render
				setPage((p) => p + 1);
			}
		});

		return () => {
			window.cancelIdleCallback(cancelableIdlCallback);
		};
	}, [page, items, itemsRef]);

	return (
		<>
			{slicedItems.map((item, i) => {
				const key = 'id' in item ? (item.id as any) : i;

				return <React.Fragment key={key}>{children ? children(item, i) : undefined}</React.Fragment>;
			})}
		</>
	);
}
