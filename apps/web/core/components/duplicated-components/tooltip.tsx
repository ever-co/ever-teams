import type { Placement } from '@popperjs/core';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { Transition } from '@headlessui/react';
import { PropsWithChildren } from 'react';
import { usePopperTooltip } from 'react-popper-tooltip';
import { clsx } from 'clsx';
import { TOOLTIP_SURFACE } from '../common/menu-recipes';
import { TooltipBubbleArrowGlyph } from '../common/tooltip';

type Props = {
	label: string;
	placement?: Placement;
	enabled?: boolean;
	labelClassName?: string;
	labelContainerClassName?: string;
} & IClassName;

/** Popper places this box along the bubble's edge; the side it sits on follows the bubble's placement. */
const POPPER_ARROW =
	'absolute h-1.5 w-3 group-data-[popper-placement^=top]/tooltip:-bottom-1.5 group-data-[popper-placement^=bottom]/tooltip:-top-1.5 group-data-[popper-placement^=left]/tooltip:-right-[9px] group-data-[popper-placement^=right]/tooltip:-left-[9px]';

/** The glyph turns toward the element (popper's inline transform owns the box) and takes the edge's gradient stop. */
const POPPER_ARROW_GLYPH =
	'block fill-(--tooltip-bottom) [&_polyline]:stroke-border group-data-[popper-placement^=top]/tooltip:rotate-180 group-data-[popper-placement^=bottom]/tooltip:fill-(--tooltip-top) group-data-[popper-placement^=left]/tooltip:rotate-90 group-data-[popper-placement^=right]/tooltip:-rotate-90';

/** A tooltip answers a pause on the element, never a pass of the pointer. */
const TOOLTIP_DELAY_MS = 400;

export function Tooltip({
	children,
	className,
	label,
	placement = 'top',
	enabled = true,
	labelClassName,
	labelContainerClassName
}: PropsWithChildren<Props>) {
	const { getArrowProps, getTooltipProps, setTooltipRef, setTriggerRef, visible } = usePopperTooltip({
		placement,
		delayShow: TOOLTIP_DELAY_MS,
		offset: [0, 6]
	});

	return (
		<>
			{enabled ? (
				<>
					<div ref={setTriggerRef} className={className}>
						{children}
					</div>

					<Transition
						as="div"
						show={visible}
						enter="transition duration-100 ease-out"
						enterFrom="transform scale-95 opacity-0"
						enterTo="transform scale-100 opacity-100"
						leave="transition duration-75 ease-out"
						leaveFrom="transform scale-100 opacity-100"
						leaveTo="transform scale-95 opacity-0"
						ref={setTooltipRef}
						{...getTooltipProps()}
						className={clsx(
							TOOLTIP_SURFACE,
							'group/tooltip z-[1000] flex w-1/3 flex-col data-[popper-interactive=false]:pointer-events-none md:w-fit',
							labelContainerClassName
						)}
					>
						<span className={labelClassName}>{label}</span>
						<span {...getArrowProps({ className: POPPER_ARROW })}>
							<span className={POPPER_ARROW_GLYPH}>
								<TooltipBubbleArrowGlyph />
							</span>
						</span>
					</Transition>
				</>
			) : (
				children
			)}
		</>
	);
}
