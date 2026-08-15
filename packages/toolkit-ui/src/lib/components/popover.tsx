'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../utils/utils';

const Popover = PopoverPrimitive.Root;
const PopoverClose = PopoverPrimitive.Close;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = ({
	ref,
	className,
	align = 'center',
	sideOffset = 4,
	...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
	ref?: React.RefObject<React.ElementRef<typeof PopoverPrimitive.Content>>;
}) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			ref={ref}
			align={align}
			sideOffset={sideOffset}
			className={cn(
				'z-50 min-w-fit rounded-md border dark:border-slate-800 bg-[hsl(var(--popover))] dark:bg-[hsl(var(--popover))] p-2 text-[hsl(var(--popover-foreground))] shadow-2xl outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				className
			)}
			{...props}
		/>
	</PopoverPrimitive.Portal>
);
PopoverContent.displayName = 'Popover';

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
