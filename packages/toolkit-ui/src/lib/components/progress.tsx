'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '../utils/utils';
import { useThemeColor } from './themed-button';

const Progress = ({
	ref,
	className,
	value,
	...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
	ref?: React.RefObject<React.ElementRef<typeof ProgressPrimitive.Root>>;
}) => {
	// Inline, so that the indicator's gradient classes cannot replace the theme's color under the kit root.
	const mainColor = useThemeColor('mainColor');
	return (
		<ProgressPrimitive.Root
			ref={ref}
			className={cn('relative h-3 w-full overflow-hidden  rounded-full bg-[hsl(var(--secondary))]/70', className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className={cn(
					'h-full w-full flex-1 transition-all bg-gradient-to-br from-primaryColor to-secondaryColor'
				)}
				style={{ background: mainColor, transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
};
Progress.displayName = 'Progress';

export { Progress };
