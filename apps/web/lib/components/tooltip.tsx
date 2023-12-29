import type { Placement } from '@popperjs/core';
import { IClassName } from '@app/interfaces';
import { Transition } from '@headlessui/react';
import { PropsWithChildren } from 'react';
import { usePopperTooltip } from 'react-popper-tooltip';
import 'react-popper-tooltip/dist/styles.css';
import { clsx } from 'clsx';

type Props = {
	label: string;
	placement?: Placement;
	enabled?: boolean;
	labelClassName?: string;
	labelContainerClassName?: string;
} & IClassName;

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
		placement
	});

	return (
		<>
			{enabled ? (
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
						className={clsx('tooltip-container w-1/3 md:w-fit', labelContainerClassName)}
					>
						<span className={clsx(labelClassName, 'text-xs font-poppins')}>{label}</span>
						<div {...getArrowProps()} className="tooltip-arrow" />
					</Transition>
				</>
			) : (
				children
			)}
		</>
	);
}
