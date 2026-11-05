'use client';

import * as React from 'react';
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';

import { cn } from '@/core/lib/helpers';
import { openStateAttribute, renderFromAsChild, useMirroredOpenState } from './base-ui';

const CollapsibleOpenContext = React.createContext(false);

interface CollapsibleProps extends CollapsiblePrimitive.Root.Props {
	asChild?: boolean;
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
	({ asChild, children, render, open, defaultOpen, onOpenChange, ...props }, ref) => {
		const { isOpen, trackOpen } = useMirroredOpenState(open, defaultOpen);
		const composed = renderFromAsChild({ asChild, children, render });
		const handleOpenChange = (nextOpen: boolean, eventDetails: CollapsiblePrimitive.Root.ChangeEventDetails) => {
			trackOpen(nextOpen);
			onOpenChange?.(nextOpen, eventDetails);
		};
		return (
			<CollapsibleOpenContext.Provider value={isOpen}>
				<CollapsiblePrimitive.Root
					ref={ref}
					data-slot="collapsible"
					data-state={openStateAttribute(isOpen)}
					open={isOpen}
					onOpenChange={handleOpenChange}
					render={composed.render}
					{...props}
				>
					{composed.children}
				</CollapsiblePrimitive.Root>
			</CollapsibleOpenContext.Provider>
		);
	}
);
Collapsible.displayName = 'Collapsible';

interface CollapsibleTriggerProps extends CollapsiblePrimitive.Trigger.Props {
	asChild?: boolean;
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const isOpen = React.useContext(CollapsibleOpenContext);
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<CollapsiblePrimitive.Trigger
				ref={ref}
				data-slot="collapsible-trigger"
				data-state={openStateAttribute(isOpen)}
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</CollapsiblePrimitive.Trigger>
		);
	}
);
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsiblePrimitive.Panel.Props>(
	({ className, ...props }, ref) => {
		const isOpen = React.useContext(CollapsibleOpenContext);
		return (
			<CollapsiblePrimitive.Panel
				ref={ref}
				data-slot="collapsible-content"
				data-state={openStateAttribute(isOpen)}
				className={cn(
					'h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-starting-style:h-0 data-ending-style:h-0',
					className
				)}
				{...props}
			/>
		);
	}
);
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
