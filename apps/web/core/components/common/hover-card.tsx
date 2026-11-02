'use client';

import * as React from 'react';
import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';

import { cn } from '@/core/lib/helpers';
import { renderFromAsChild } from './base-ui';

interface HoverCardDelays {
	openDelay: number;
	closeDelay: number;
}

const RADIX_OPEN_DELAY = 700;
const RADIX_CLOSE_DELAY = 300;

const HoverCardDelayContext = React.createContext<HoverCardDelays>({
	openDelay: RADIX_OPEN_DELAY,
	closeDelay: RADIX_CLOSE_DELAY
});

interface HoverCardProps extends PreviewCardPrimitive.Root.Props {
	openDelay?: number;
	closeDelay?: number;
}

function HoverCard({ openDelay = RADIX_OPEN_DELAY, closeDelay = RADIX_CLOSE_DELAY, ...props }: HoverCardProps) {
	const delays = React.useMemo(() => ({ openDelay, closeDelay }), [openDelay, closeDelay]);
	return (
		<HoverCardDelayContext.Provider value={delays}>
			<PreviewCardPrimitive.Root {...props} />
		</HoverCardDelayContext.Provider>
	);
}
HoverCard.displayName = 'HoverCard';

interface HoverCardTriggerProps extends PreviewCardPrimitive.Trigger.Props {
	asChild?: boolean;
}

const HoverCardTrigger = React.forwardRef<HTMLAnchorElement, HoverCardTriggerProps>(
	({ asChild, children, render, delay, closeDelay, ...props }, ref) => {
		const delays = React.useContext(HoverCardDelayContext);
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedDelay = delay ?? delays.openDelay;
		const resolvedCloseDelay = closeDelay ?? delays.closeDelay;
		return (
			<PreviewCardPrimitive.Trigger
				ref={ref}
				data-slot="hover-card-trigger"
				delay={resolvedDelay}
				closeDelay={resolvedCloseDelay}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</PreviewCardPrimitive.Trigger>
		);
	}
);
HoverCardTrigger.displayName = 'HoverCardTrigger';

type HoverCardPositionProps = Pick<
	PreviewCardPrimitive.Positioner.Props,
	'align' | 'alignOffset' | 'side' | 'sideOffset' | 'collisionPadding'
>;

interface HoverCardContentProps extends PreviewCardPrimitive.Popup.Props, HoverCardPositionProps {}

const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(
	(
		{ className, align = 'center', alignOffset, side = 'bottom', sideOffset = 4, collisionPadding, ...props },
		ref
	) => (
		<PreviewCardPrimitive.Portal>
			<PreviewCardPrimitive.Positioner
				data-slot="hover-card-positioner"
				className="z-[1000] outline-hidden"
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				collisionPadding={collisionPadding}
			>
				<PreviewCardPrimitive.Popup
					ref={ref}
					data-slot="hover-card-content"
					className={cn(
						'z-[1000] w-64 rounded-xl bg-popover p-4 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 outline-hidden origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
						className
					)}
					{...props}
				/>
			</PreviewCardPrimitive.Positioner>
		</PreviewCardPrimitive.Portal>
	)
);
HoverCardContent.displayName = 'HoverCardContent';

export { HoverCard, HoverCardTrigger, HoverCardContent };
