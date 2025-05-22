'use client';
import { useEffect, useState } from 'react';

export function useElementHeight<T extends HTMLElement | null>(ref: React.RefObject<T>) {
	const [height, setHeight] = useState<number>(0);

	useEffect(() => {
		if (!ref.current) return;

		const observer = new ResizeObserver(([entry]) => {
			setHeight(entry.contentRect.height);
		});

		observer.observe(ref.current);

		return () => observer.disconnect();
	}, [ref]);

	return height;
}
