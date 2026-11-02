'use client';

import * as React from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@/core/lib/helpers';

interface ScrollAreaProps extends ScrollAreaPrimitive.Root.Props {
	/** Classes of the scrolled content; `w-full min-w-0!` pins it to the viewport width for a vertical-only list. */
	contentClassName?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
	({ className, contentClassName, children, ...props }, ref) => (
		<ScrollAreaPrimitive.Root
			ref={ref}
			data-slot="scroll-area"
			className={cn('relative overflow-hidden', className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="h-full w-full rounded-[inherit]">
				<ScrollAreaPrimitive.Content className={cn('block w-fit min-w-full!', contentClassName)}>
					{children}
				</ScrollAreaPrimitive.Content>
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	)
);
ScrollArea.displayName = 'ScrollArea';

const scrollBarVisibilityRecipe =
	'opacity-0 transition-[color,background-color,opacity] pointer-events-none data-hovering:pointer-events-auto data-hovering:opacity-100 data-scrolling:pointer-events-auto data-scrolling:opacity-100 data-scrolling:duration-0';

const ScrollBar = React.forwardRef<HTMLDivElement, ScrollAreaPrimitive.Scrollbar.Props>(
	({ className, orientation = 'vertical', ...props }, ref) => {
		const isVertical = orientation === 'vertical';
		const isHorizontal = !isVertical;
		return (
			<ScrollAreaPrimitive.Scrollbar
				ref={ref}
				data-slot="scroll-area-scrollbar"
				orientation={orientation}
				className={cn(
					'flex touch-none select-none',
					scrollBarVisibilityRecipe,
					isVertical && 'h-full w-2.5 hairline-l border-l-transparent p-[1px]',
					isHorizontal && 'h-2.5 flex-col hairline-t border-t-transparent p-[1px]',
					className
				)}
				{...props}
			>
				<ScrollAreaPrimitive.Thumb
					data-slot="scroll-area-thumb"
					className="relative flex-1 rounded-full bg-border"
				/>
			</ScrollAreaPrimitive.Scrollbar>
		);
	}
);
ScrollBar.displayName = 'ScrollBar';

export { ScrollArea, ScrollBar };
