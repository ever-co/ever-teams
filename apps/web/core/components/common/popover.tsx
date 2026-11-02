'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@/core/lib/helpers';
import { openStateAttribute, renderFromAsChild, useMirroredOpenState } from './base-ui';

const PopoverOpenContext = React.createContext(false);

function Popover({ open, defaultOpen, onOpenChange, ...props }: PopoverPrimitive.Root.Props) {
	const { isOpen, trackOpen } = useMirroredOpenState(open, defaultOpen);
	const handleOpenChange = (nextOpen: boolean, eventDetails: PopoverPrimitive.Root.ChangeEventDetails) => {
		trackOpen(nextOpen);
		onOpenChange?.(nextOpen, eventDetails);
	};
	return (
		<PopoverOpenContext.Provider value={isOpen}>
			<PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange} {...props} />
		</PopoverOpenContext.Provider>
	);
}
Popover.displayName = 'Popover';

interface PopoverTriggerProps extends PopoverPrimitive.Trigger.Props {
	asChild?: boolean;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const isOpen = React.useContext(PopoverOpenContext);
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<PopoverPrimitive.Trigger
				ref={ref}
				data-slot="popover-trigger"
				data-state={openStateAttribute(isOpen)}
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</PopoverPrimitive.Trigger>
		);
	}
);
PopoverTrigger.displayName = 'PopoverTrigger';

interface PopoverCloseProps extends PopoverPrimitive.Close.Props {
	asChild?: boolean;
}

const PopoverClose = React.forwardRef<HTMLButtonElement, PopoverCloseProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<PopoverPrimitive.Close
				ref={ref}
				data-slot="popover-close"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</PopoverPrimitive.Close>
		);
	}
);
PopoverClose.displayName = 'PopoverClose';

const PopoverPortal = PopoverPrimitive.Portal;

const popoverSurfaceRecipe =
	'rounded-xl bg-popover text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 outline-hidden';

const popoverMotionRecipe =
	'origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0';

const radixPopoverVariablesRecipe =
	'[--radix-popover-trigger-width:var(--anchor-width)] [--radix-popover-trigger-height:var(--anchor-height)] [--radix-popover-content-available-height:var(--available-height)]';

type PopoverPositionProps = Pick<
	PopoverPrimitive.Positioner.Props,
	'align' | 'alignOffset' | 'side' | 'sideOffset' | 'collisionPadding' | 'anchor' | 'sticky'
>;

interface PopoverContentProps extends PopoverPrimitive.Popup.Props, PopoverPositionProps {}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
	(
		{
			className,
			align = 'center',
			alignOffset,
			side = 'bottom',
			sideOffset = 4,
			collisionPadding,
			anchor,
			sticky,
			...props
		},
		ref
	) => (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				data-slot="popover-positioner"
				className="z-[1000] outline-hidden"
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				collisionPadding={collisionPadding}
				anchor={anchor}
				sticky={sticky}
			>
				<PopoverPrimitive.Popup
					ref={ref}
					data-slot="popover-content"
					className={cn(
						'z-[1000] w-72 p-4',
						popoverSurfaceRecipe,
						popoverMotionRecipe,
						radixPopoverVariablesRecipe,
						className
					)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	)
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent, PopoverClose, PopoverPortal, popoverSurfaceRecipe };
