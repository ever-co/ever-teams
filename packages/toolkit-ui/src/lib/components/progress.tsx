/** @jsxImportSource theme-ui */
'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '../utils/utils';

const Progress = ({
	ref,
	className,
	value,
	...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
	ref?: React.RefObject<React.ElementRef<typeof ProgressPrimitive.Root>>;
}) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn('relative h-3 w-full overflow-hidden  rounded-full bg-[hsl(var(--secondary))]/70', className)}
		{...props}
	>
		<ProgressPrimitive.Indicator
			className={cn('h-full w-full flex-1 transition-all bg-gradient-to-br from-primaryColor to-secondaryColor')}
			style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			sx={{ background: 'mainColor' }}
		/>
	</ProgressPrimitive.Root>
);
Progress.displayName = 'Progress';

export { Progress };
