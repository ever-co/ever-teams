'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@/core/lib/helpers';
import { renderFromAsChild, stopBaseUIHandlerWhenDefaultPrevented } from './base-ui';
import { TOOLTIP_ARROW_FILL, TOOLTIP_SURFACE } from './menu-recipes';

interface TooltipProviderProps extends TooltipPrimitive.Provider.Props {
	delayDuration?: number;
	skipDelayDuration?: number;
}

function TooltipProvider({ delayDuration, skipDelayDuration, delay, timeout, ...props }: TooltipProviderProps) {
	const resolvedDelay = delay ?? delayDuration;
	const resolvedTimeout = timeout ?? skipDelayDuration;
	return <TooltipPrimitive.Provider delay={resolvedDelay} timeout={resolvedTimeout} {...props} />;
}
TooltipProvider.displayName = 'TooltipProvider';

const Tooltip = TooltipPrimitive.Root;

interface TooltipTriggerProps extends TooltipPrimitive.Trigger.Props {
	asChild?: boolean;
}

type TooltipTriggerBlurEvent = Parameters<NonNullable<TooltipPrimitive.Trigger.Props['onBlur']>>[0];

const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
	({ asChild, children, render, onBlur, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const handleBlur = (event: TooltipTriggerBlurEvent) => {
			onBlur?.(event);
			stopBaseUIHandlerWhenDefaultPrevented(event);
		};
		return (
			<TooltipPrimitive.Trigger
				ref={ref}
				data-slot="tooltip-trigger"
				render={composed.render}
				onBlur={handleBlur}
				{...props}
			>
				{composed.children}
			</TooltipPrimitive.Trigger>
		);
	}
);
TooltipTrigger.displayName = 'TooltipTrigger';

type TooltipPositionProps = Pick<
	TooltipPrimitive.Positioner.Props,
	'align' | 'alignOffset' | 'side' | 'sideOffset' | 'collisionPadding' | 'anchor'
>;

interface TooltipContentProps extends TooltipPrimitive.Popup.Props, TooltipPositionProps {}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
	(
		{
			className,
			align = 'center',
			alignOffset,
			side = 'top',
			sideOffset = 4,
			collisionPadding,
			anchor,
			hidden,
			children,
			...props
		},
		ref
	) => (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				data-slot="tooltip-positioner"
				className="z-[1000]"
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				collisionPadding={collisionPadding}
				anchor={anchor}
				hidden={hidden}
			>
				<TooltipPrimitive.Popup
					ref={ref}
					data-slot="tooltip-content"
					hidden={hidden}
					className={cn(
						TOOLTIP_SURFACE,
						'z-[1000] w-fit origin-(--transform-origin) transition-[opacity,scale] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
						className
					)}
					{...props}
				>
					{children}
					<TooltipBubbleArrow />
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	)
);
TooltipContent.displayName = 'TooltipContent';

/**
 * The arrow of a tooltip bubble, drawn pointing up and turned toward the element: a triangle in the bubble's edge
 * colour and a hairline on its two outer sides, so it reads as part of the bubble's outline.
 */
export function TooltipBubbleArrowGlyph() {
	return (
		<svg width="12" height="6" viewBox="0 0 12 6" aria-hidden="true" className="block overflow-visible">
			<polygon points="0,6 6,0 12,6" />
			<polyline points="0,6 6,0 12,6" fill="none" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
		</svg>
	);
}

function TooltipBubbleArrow() {
	return (
		<TooltipPrimitive.Arrow
			data-slot="tooltip-bubble-arrow"
			className={cn(
				'block h-1.5 w-3 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-180 data-[side=bottom]:-top-1.5 data-[side=left]:-right-[9px] data-[side=left]:rotate-90 data-[side=right]:-left-[9px] data-[side=right]:-rotate-90',
				TOOLTIP_ARROW_FILL
			)}
		>
			<TooltipBubbleArrowGlyph />
		</TooltipPrimitive.Arrow>
	);
}

const defaultArrowGlyph = (
	<svg width="10" height="5" viewBox="0 0 30 10" preserveAspectRatio="none" aria-hidden="true">
		<polygon points="0,10 30,10 15,0" />
	</svg>
);

const TooltipArrow = React.forwardRef<HTMLDivElement, TooltipPrimitive.Arrow.Props>(
	({ className, children, ...props }, ref) => {
		const arrowChildren = children ?? defaultArrowGlyph;
		return (
			<TooltipPrimitive.Arrow
				ref={ref}
				data-slot="tooltip-arrow"
				className={cn(
					'block h-[5px] w-[10px] fill-current data-[side=top]:bottom-[-5px] data-[side=top]:rotate-180 data-[side=bottom]:top-[-5px] data-[side=left]:right-[-7.5px] data-[side=left]:rotate-90 data-[side=right]:left-[-7.5px] data-[side=right]:-rotate-90',
					className
				)}
				{...props}
			>
				{arrowChildren}
			</TooltipPrimitive.Arrow>
		);
	}
);
TooltipArrow.displayName = 'TooltipArrow';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow };
