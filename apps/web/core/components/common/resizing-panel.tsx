'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/core/lib/helpers';

/**
 * A box whose height follows its content with a transition. It starts without a fixed height, so the
 * container measures the natural size of a new panel, and only then holds the measured value to animate
 * the next change.
 */
function heightStyle(height: number | null) {
	if (height === null) {
		return undefined;
	}
	return { height };
}

export function ResizingPanel({ children, className }: { children: ReactNode; className?: string }) {
	const innerRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | null>(null);

	useLayoutEffect(() => {
		const inner = innerRef.current;
		if (!inner) return;
		const observer = new ResizeObserver(() => setHeight(inner.offsetHeight));
		observer.observe(inner);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			style={heightStyle(height)}
			className={cn(
				'overflow-clip transition-[height] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]',
				className
			)}
		>
			<div ref={innerRef}>{children}</div>
		</div>
	);
}
