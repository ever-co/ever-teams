'use client';

import * as React from 'react';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '@/core/lib/helpers';

interface SeparatorProps extends SeparatorPrimitive.Props {
	decorative?: boolean;
}

interface DecorativeAttributes {
	role?: 'none';
	'aria-orientation'?: undefined;
}

/** A decorative separator is invisible to assistive technology, the way Radix rendered it by default. */
function decorativeAttributes(decorative: boolean): DecorativeAttributes {
	if (!decorative) {
		return {};
	}
	return { role: 'none', 'aria-orientation': undefined };
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
	({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => {
		const isHorizontal = orientation === 'horizontal';
		const isVertical = !isHorizontal;
		return (
			<SeparatorPrimitive
				ref={ref}
				data-slot="separator"
				orientation={orientation}
				className={cn(
					'shrink-0 bg-border',
					isHorizontal && 'h-[1px] w-full',
					isVertical && 'h-full w-[1px]',
					className
				)}
				{...decorativeAttributes(decorative)}
				{...props}
			/>
		);
	}
);
Separator.displayName = 'Separator';

export default Separator;
