'use client';

import { clsxm } from '@app/utils';
import { Dialog, Transition } from '@headlessui/react';
import Image from 'next/image';
import { Fragment, PropsWithChildren, useRef } from 'react';

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
			as={Fragment}
		>
			<Dialog
				initialFocus={refDiv}
				onClose={closeOnOutsideClick ? closeModal : () => null}
				as="div"
				className="fixed inset-0 backdrop-brightness-90 backdrop-blur-sm z-[9999] w-full h-full"
			>
				<div ref={refDiv} className="absolute inset-0 flex items-center justify-center p-4 w-full">
					<Dialog.Overlay
						className={clsxm('flex justify-center items-center flex-col space-y-1 relative', className)}
					>
						<Dialog.Panel
							className={clsxm('flex justify-center items-center flex-col space-y-1 relative', className)}
						>
							{title && <Dialog.Title className={clsxm(titleClass)}>{title}</Dialog.Title>}
							{description && <Dialog.Description>{description}</Dialog.Description>}
							{showCloseIcon && (
								<div
									onClick={() => {
										closeModal();
										customCloseModal?.();
									}}
									className={`absolute ${alignCloseIcon ? 'right-2 top-3' : 'right-3 top-3'
										}  md:right-2 md:top-3 cursor-pointer z-50`}
								>
									<Image
										src={'/assets/svg/close.svg'}
										alt="close"
										width={28}
										height={28}
										className="w-6 md:w-7"
									/>
								</div>
							)}
							{children}
						</Dialog.Panel>
					</Dialog.Overlay>
				</div>
			</Dialog>
		</Transition>
	);
}
