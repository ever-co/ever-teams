import type { Placement } from '@popperjs/core';

import { Transition } from '@headlessui/react';
import { PropsWithChildren } from 'react';
import { usePopperTooltip } from 'react-popper-tooltip';
import 'react-popper-tooltip/dist/styles.css';
import { clsx } from 'clsx';

export type IClassName<T = object> = {
	className?: string;
	fullWidth?: boolean;
	type?: 'VERTICAL' | 'HORIZONTAL';
} & T;
type Props = {
	message: string;
	placement?: Placement;
	enabled?: boolean;
	labelClassName?: string;
	className?: string;
	labelContainerClassName?: string;
} & IClassName;

export function Tooltip({
	children,
	className,
	message,
	placement = 'top',
	enabled = true,
	labelClassName,
	labelContainerClassName
}: PropsWithChildren<Props>) {
	const { getArrowProps, getTooltipProps, setTooltipRef, setTriggerRef, visible } = usePopperTooltip({
		placement
	});

	return (
		<>
			{enabled && message ? (
				<>
					<div ref={setTriggerRef} className={className}>
						{children}
					</div>

					<Transition
						show={visible}
						enter="transition duration-100 ease-out"
						enterFrom="transform scale-95 opacity-0"
						enterTo="transform scale-100 opacity-100"
						leave="transition duration-75 ease-out"
						leaveFrom="transform scale-100 opacity-100"
						leaveTo="transform scale-95 opacity-0"
						ref={setTooltipRef}
						{...getTooltipProps()}
						as={'span'}
						className={clsx('text-white bg-black/80  md:w-fit p-2 rounded-md', labelContainerClassName)}
						data-popper-placement={placement}
					>
						<span className={clsx(labelClassName, 'text-xs ')}>{message}</span>
						<div {...getArrowProps()} className="tooltip-arrow" />
					</Transition>
				</>
			) : (
				children
			)}
		</>
	);
}
