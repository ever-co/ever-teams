'use client';

import { Description, Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react';
import Image from 'next/image';
import { PropsWithChildren, useRef } from 'react';
import { cn } from '../lib/helpers';

type Props = {
	title?: string;
	titleClass?: string;
	description?: string;
	isOpen: boolean;
	closeModal: () => void;
	customCloseModal?: () => void;
	className?: string;
	alignCloseIcon?: boolean;
	showCloseIcon?: boolean;
	closeOnOutsideClick?: boolean;
} & PropsWithChildren;

export function Modal({
	isOpen,
	closeModal,
	customCloseModal,
	children,
	title,
	titleClass,
	description,
	className,
	alignCloseIcon,
	showCloseIcon = true,
	closeOnOutsideClick = false
}: Props) {
	const refDiv = useRef(null);

	return (
		<Transition
			show={isOpen}
			enter="transition duration-100 ease-out"
			enterFrom="transform scale-95 opacity-0"
			enterTo="transform scale-100 opacity-100"
			leave="transition duration-75 ease-out"
			leaveFrom="transform scale-100 opacity-100"
			leaveTo="transform scale-95 opacity-0"
			as="div"
		>
			<Dialog
				as="div"
				className="fixed inset-0 backdrop-brightness-90 backdrop-blur-sm z-[9999] w-full h-full"
				onClose={closeOnOutsideClick ? closeModal : () => null}
				initialFocus={refDiv}
			>
				<div ref={refDiv} className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel
						className={cn(
							'relative bg-white rounded-lg p-6 shadow-xl dark:bg-dark--theme-light dark:shadow-xl dark:shadow-dark--theme-light',
							'flex flex-col space-y-4',
							className
						)}
					>
						{showCloseIcon && (
							<button
								type="button"
								onClick={() => {
									closeModal();
									customCloseModal?.();
								}}
								className={cn(
									'absolute cursor-pointer z-50',
									alignCloseIcon ? 'right-2 top-3' : 'right-3 top-3'
								)}
							>
								<Image
									src={'/assets/svg/close.svg'}
									alt="close"
									width={28}
									height={28}
									className="w-6 md:w-7"
								/>
							</button>
						)}

						{title && (
							<DialogTitle
								className={cn(
									'text-lg font-medium leading-6 text-gray-900 dark:text-white',
									titleClass
								)}
							>
								{title}
							</DialogTitle>
						)}

						{description && <Description className="text-sm text-gray-500">{description}</Description>}

						{children}
					</DialogPanel>
				</div>
			</Dialog>
		</Transition>
	);
}
