'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { ChevronRight, X } from '@/core/components/icons/hugeicons';

import { cn } from '@/core/lib/helpers';
import { buttonVariants } from '../duplicated-components/_button';
import { renderFromAsChild } from './base-ui';

const dialogSurface =
	'rounded-[16px] surface-raised p-5 text-popover-foreground outline-none transition-[opacity,scale] duration-200 data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-150';

const dialogCloseButton = 'absolute right-3 top-3 text-muted-foreground';

const dialogTitleText = 'min-w-0 text-sm font-medium leading-6 text-foreground';

const DialogHeaderRow = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="dialog-header-row"
		className={cn('flex min-h-7 min-w-0 items-center gap-1.5', className)}
		{...props}
	/>
);
DialogHeaderRow.displayName = 'DialogHeaderRow';

const DialogBreadcrumb = ({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
	<span
		data-slot="dialog-breadcrumb"
		className={cn(
			'inline-flex h-6 max-w-48 shrink-0 items-center gap-1.5 rounded-md hairline-border border-border bg-card px-1.5 text-[13px] text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0',
			className
		)}
		{...props}
	>
		<span className="min-w-0 truncate">{children}</span>
	</span>
);
DialogBreadcrumb.displayName = 'DialogBreadcrumb';

const DialogBreadcrumbSeparator = () => (
	<ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
);
DialogBreadcrumbSeparator.displayName = 'DialogBreadcrumbSeparator';

const Dialog = DialogPrimitive.Root;

const DialogPortal = DialogPrimitive.Portal;

interface DialogTriggerProps extends DialogPrimitive.Trigger.Props {
	asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<DialogPrimitive.Trigger
				ref={ref}
				data-slot="dialog-trigger"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</DialogPrimitive.Trigger>
		);
	}
);
DialogTrigger.displayName = 'DialogTrigger';

interface DialogCloseProps extends DialogPrimitive.Close.Props {
	asChild?: boolean;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<DialogPrimitive.Close
				ref={ref}
				data-slot="dialog-close"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</DialogPrimitive.Close>
		);
	}
);
DialogClose.displayName = 'DialogClose';

const DialogOverlay = React.forwardRef<HTMLDivElement, DialogPrimitive.Backdrop.Props>(
	({ className, ...props }, ref) => (
		<DialogPrimitive.Backdrop
			ref={ref}
			data-slot="dialog-overlay"
			className={cn(
				'fixed inset-0 z-[1000] bg-black/20 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-150',
				className
			)}
			{...props}
		/>
	)
);
DialogOverlay.displayName = 'DialogOverlay';

const DialogViewport = React.forwardRef<HTMLDivElement, DialogPrimitive.Viewport.Props>(
	({ className, ...props }, ref) => (
		<DialogPrimitive.Viewport
			ref={ref}
			data-slot="dialog-viewport"
			className={cn('fixed inset-0 z-[1000]', className)}
			{...props}
		/>
	)
);
DialogViewport.displayName = 'DialogViewport';

interface DialogContentProps extends DialogPrimitive.Popup.Props {
	showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
	({ className, children, showCloseButton = true, ...props }, ref) => {
		const t = useTranslations();
		return (
			<DialogPortal>
				<DialogOverlay />
				<DialogViewport>
					<DialogPrimitive.Popup
						ref={ref}
						data-slot="dialog-content"
						className={cn(
							dialogSurface,
							'fixed left-[50%] top-[50%] z-[1000] grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto',
							className
						)}
						{...props}
					>
						{children}
						{showCloseButton && (
							<DialogPrimitive.Close
								data-slot="dialog-close"
								aria-label={t('common.CLOSE')}
								className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), dialogCloseButton)}
							>
								<X />
							</DialogPrimitive.Close>
						)}
					</DialogPrimitive.Popup>
				</DialogViewport>
			</DialogPortal>
		);
	}
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div data-slot="dialog-header" className={cn('flex flex-col gap-1.5 pr-9 text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="dialog-footer"
		className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
		{...props}
	/>
);
DialogFooter.displayName = 'DialogFooter';

interface DialogTitleProps extends DialogPrimitive.Title.Props {
	breadcrumb?: React.ReactNode;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
	({ className, breadcrumb, ...props }, ref) => {
		const title = (
			<DialogPrimitive.Title
				ref={ref}
				data-slot="dialog-title"
				className={cn(dialogTitleText, className)}
				{...props}
			/>
		);
		if (!breadcrumb) {
			return title;
		}
		return (
			<DialogHeaderRow>
				<DialogBreadcrumb>{breadcrumb}</DialogBreadcrumb>
				<DialogBreadcrumbSeparator />
				{title}
			</DialogHeaderRow>
		);
	}
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogPrimitive.Description.Props>(
	({ className, ...props }, ref) => (
		<DialogPrimitive.Description
			ref={ref}
			data-slot="dialog-description"
			className={cn('text-[13px] text-muted-foreground', className)}
			{...props}
		/>
	)
);
DialogDescription.displayName = 'DialogDescription';

export {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogViewport,
	DialogClose,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	DialogHeaderRow,
	DialogBreadcrumb,
	DialogBreadcrumbSeparator,
	dialogSurface,
	dialogCloseButton,
	dialogTitleText
};
