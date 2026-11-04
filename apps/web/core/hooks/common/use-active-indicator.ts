'use client';

import { useEffect, useRef, useState } from 'react';

export interface IndicatorBox {
	left: number;
	width: number;
}

/**
 * One indicator for a whole tab list: it reads the active item's box and is moved with a transform,
 * instead of one indicator per item. The box stays `null` until the first measurement, so the server
 * output can draw the indicator inside the active item and nothing slides on first paint. The list ref
 * is optional; it is only there to re-measure when the list itself resizes.
 */
function isSameBox(current: IndicatorBox | null, next: IndicatorBox) {
	if (!current) {
		return false;
	}
	const isSameLeft = current.left === next.left;
	const isSameWidth = current.width === next.width;
	return isSameLeft && isSameWidth;
}

function keepBoxWhenUnchanged(current: IndicatorBox | null, next: IndicatorBox) {
	if (isSameBox(current, next)) {
		return current;
	}
	return next;
}

export function useActiveIndicator<L extends HTMLElement, I extends HTMLElement>(activeKey: string) {
	const listRef = useRef<L>(null);
	const activeRef = useRef<I>(null);
	const [box, setBox] = useState<IndicatorBox | null>(null);

	useEffect(() => {
		const item = activeRef.current;
		if (!item) return;
		const list = listRef.current;

		const update = () => {
			const next = { left: item.offsetLeft, width: item.offsetWidth };
			setBox((current) => keepBoxWhenUnchanged(current, next));
		};

		update();
		const observer = new ResizeObserver(update);
		if (list) observer.observe(list);
		observer.observe(item);
		return () => observer.disconnect();
	}, [activeKey]);

	return { listRef, activeRef, box };
}
