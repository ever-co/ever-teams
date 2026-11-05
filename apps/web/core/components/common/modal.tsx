'use client';

import { Description, Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { Fragment, PropsWithChildren, ReactNode, useRef } from 'react';
import { X } from '@/core/components/icons/hugeicons';
import { cn } from '../../lib/helpers';
import { Button } from '../duplicated-components/_button';
import {
	DialogBreadcrumb,
	DialogBreadcrumbSeparator,
	DialogHeaderRow,
	dialogCloseButton,
	dialogTitleText
} from './dialog';

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
	breadcrumb?: ReactNode;
} & PropsWithChildren;

export const modalFooterClass = 'flex flex-wrap items-center justify-end gap-2 pt-1';
export const modalPrimaryActionClass = 'rounded-full px-3.5 text-[13px]';
export const modalSecondaryActionClass = 'text-[13px] text-muted-foreground hover:text-foreground';
export const modalTitleFieldClass =
	'w-full min-w-0 border-0 bg-transparent p-0 text-lg font-semibold text-foreground shadow-none outline-none ring-0 placeholder:font-semibold placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-xl dark:bg-transparent';
export const modalDescriptionFieldClass =
	'w-full min-w-0 resize-none border-0 bg-transparent p-0 text-sm text-foreground shadow-none outline-none ring-0 placeholder:text-muted-foreground/70 focus-visible:ring-0 dark:bg-transparent';
export const modalPropertyPillClass =
	'inline-flex h-7 w-auto max-w-full items-center gap-1.5 rounded-full hairline-border border-transparent bg-card px-2.5 py-0 text-[13px] font-normal text-foreground shadow-[0_1px_1px_rgb(0_0_0/0.04)] hairline-ring ring-border transition-colors hover:bg-foreground/[0.03] md:text-[13px] dark:bg-foreground/5 dark:ring-border [&_svg]:size-3.5 [&_svg]:shrink-0';
export const modalFieldLabelClass = 'text-xs font-medium text-muted-foreground';

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
	closeOnOutsideClick = false,
	breadcrumb
}: Props) {
	const t = useTranslations();
	const refDiv = useRef(null);
	const hasBreadcrumb = Boolean(breadcrumb);
	const hasTitle = Boolean(title);
	const hasHeader = hasBreadcrumb || hasTitle;
	const showBreadcrumbSeparator = hasBreadcrumb && hasTitle;

	const handleClose = () => {
		closeModal();
		customCloseModal?.();
	};

	return (
		<Transition show={isOpen} as={Fragment} appear>
			<Dialog
				as="div"
				className="relative z-[1000]"
				onClose={closeOnOutsideClick ? closeModal : () => null}
				initialFocus={refDiv}
			>
				<TransitionChild
					as={Fragment}
					enter="transition-opacity duration-200 ease-out"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="transition-opacity duration-150 ease-in"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/20" aria-hidden="true" />
				</TransitionChild>

				<div ref={refDiv} className="fixed inset-0 flex items-center justify-center p-4">
					<TransitionChild
						as={Fragment}
						enter="transition-[opacity,scale] duration-200 ease-out"
						enterFrom="opacity-0 scale-[0.98]"
						enterTo="opacity-100 scale-100"
						leave="transition-[opacity,scale] duration-150 ease-in"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-[0.98]"
					>
						<DialogPanel
							className={cn(
								'relative flex max-w-full flex-col gap-4 rounded-[16px] surface-raised p-5 text-popover-foreground outline-none',
								className
							)}
						>
							{showCloseIcon && (
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={handleClose}
									aria-label={t('common.CLOSE')}
									className={cn(dialogCloseButton, 'z-50', alignCloseIcon && 'right-2 top-2')}
								>
									<X />
								</Button>
							)}

							{hasHeader && (
								<DialogHeaderRow className="pr-9">
									{hasBreadcrumb && <DialogBreadcrumb>{breadcrumb}</DialogBreadcrumb>}
									{showBreadcrumbSeparator && <DialogBreadcrumbSeparator />}
									{hasTitle && (
										<DialogTitle className={cn(dialogTitleText, titleClass)}>{title}</DialogTitle>
									)}
								</DialogHeaderRow>
							)}

							{description && (
								<Description className="-mt-2 text-[13px] text-muted-foreground">
									{description}
								</Description>
							)}

							{children}
						</DialogPanel>
					</TransitionChild>
				</div>
			</Dialog>
		</Transition>
	);
}
