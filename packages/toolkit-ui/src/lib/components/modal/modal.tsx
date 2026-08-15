'use client';

import { cn } from '@/lib/utils/utils';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, PropsWithChildren, useRef } from 'react';

type Props = {
	title?: string;
	titleClass?: string;
	description?: string;
	isOpen: boolean;
	closeModal: () => void;
	className?: string;
	alignCloseIcon?: boolean;
	showCloseIcon?: boolean;
} & PropsWithChildren;

export function Modal({
	isOpen,
	closeModal,
	children,
	title,
	titleClass,
	description,
	className,
	alignCloseIcon,
	showCloseIcon = true
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
				onClose={closeModal}
				as="div"
				className="fixed inset-0 z-[9999] w-full h-full"
			>
				<div
					style={{
						opacity: 0.3
					}}
					className="fixed inset-0 bg-black"
					aria-hidden="true"
				/>

				<div ref={refDiv} className="absolute inset-0 flex items-center justify-center p-4 w-full">
					<div className={cn('flex justify-center items-center flex-col space-y-1 relative', className)}>
						{title && <h3 className={cn(titleClass)}>{title}</h3>}
						{description && <p>{description}</p>}
						{showCloseIcon && (
							<div
								onClick={closeModal}
								className={`absolute ${
									alignCloseIcon ? 'right-2 top-3' : 'right-3 top-3'
								} md:right-2 md:top-3 cursor-pointer z-50`}
							>
								<svg
									width="25"
									height="25"
									viewBox="0 0 15 15"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
										fill="currentColor"
										fillRule="evenodd"
										clipRule="evenodd"
									></path>
								</svg>
							</div>
						)}
						{children}
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}
