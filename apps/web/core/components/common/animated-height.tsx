'use client';

import { type ReactNode, useState } from 'react';

import { cn } from '@/core/lib/helpers';

import { ResizingPanel } from './resizing-panel';

/**
 * The panel clips while it resizes, so its content sits one focus ring inside it and the negative margin
 * gives that space back. A new `swapKey` fades the new content in; the first render never animates.
 */
export function AnimatedHeight({
	swapKey,
	className,
	children
}: Readonly<{
	swapKey?: string;
	className?: string;
	children: ReactNode;
}>) {
	const [firstKey] = useState(swapKey);
	const [swapped, setSwapped] = useState(false);
	if (!swapped && swapKey !== firstKey) setSwapped(true);

	return (
		<div className="-m-1">
			<ResizingPanel className={className}>
				<div
					key={swapKey}
					className={cn('p-1', swapped && 'animate-in fade-in-0 slide-in-from-top-1 duration-200')}
				>
					{children}
				</div>
			</ResizingPanel>
		</div>
	);
}
