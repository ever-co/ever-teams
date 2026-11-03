'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/core/lib/helpers';

type TabsActivationMode = 'automatic' | 'manual';

const TabsActivateOnFocusContext = React.createContext(true);

interface TabsProps extends TabsPrimitive.Root.Props {
	activationMode?: TabsActivationMode;
}

function Tabs({ className, activationMode = 'automatic', ...props }: Readonly<TabsProps>) {
	const activateOnFocus = activationMode !== 'manual';
	return (
		<TabsActivateOnFocusContext.Provider value={activateOnFocus}>
			<TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />
		</TabsActivateOnFocusContext.Provider>
	);
}

/** One indicator for the whole list; Base UI measures the active tab and exposes it through CSS variables. */
function TabsList({ className, children, activateOnFocus, ...props }: TabsPrimitive.List.Props) {
	const activateOnFocusFromRoot = React.useContext(TabsActivateOnFocusContext);
	const resolvedActivateOnFocus = activateOnFocus ?? activateOnFocusFromRoot;
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			activateOnFocus={resolvedActivateOnFocus}
			className={cn(
				'relative flex w-full items-end gap-6 overflow-x-auto hairline-b border-border no-scrollbar',
				className
			)}
			{...props}
		>
			{children}
			<TabsPrimitive.Indicator
				data-slot="tabs-indicator"
				className="pointer-events-none absolute bottom-0 left-0 h-0.75 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-t-full bg-primary transition-[translate,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
			/>
		</TabsPrimitive.List>
	);
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				"flex cursor-pointer items-center gap-1.5 whitespace-nowrap pb-3 pt-2 text-[13px] font-medium text-foreground/55 outline-none transition-colors duration-150 hover:text-foreground/80 focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return <TabsPrimitive.Panel data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
