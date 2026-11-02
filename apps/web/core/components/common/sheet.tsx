'use client';

import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslations } from 'next-intl';
import { X } from '@/core/components/icons/hugeicons';

import { cn } from '@/core/lib/helpers';
import { buttonVariants } from '../duplicated-components/_button';
import { renderFromAsChild } from './base-ui';

const Sheet = SheetPrimitive.Root;

const SheetPortal = SheetPrimitive.Portal;

interface SheetTriggerProps extends SheetPrimitive.Trigger.Props {
	asChild?: boolean;
}

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<SheetPrimitive.Trigger
				ref={ref}
				data-slot="sheet-trigger"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</SheetPrimitive.Trigger>
		);
	}
);
SheetTrigger.displayName = 'SheetTrigger';

interface SheetCloseProps extends SheetPrimitive.Close.Props {
	asChild?: boolean;
}

const SheetClose = React.forwardRef<HTMLButtonElement, SheetCloseProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<SheetPrimitive.Close
				ref={ref}
				data-slot="sheet-close"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</SheetPrimitive.Close>
		);
	}
);
SheetClose.displayName = 'SheetClose';

const SheetOverlay = React.forwardRef<HTMLDivElement, SheetPrimitive.Backdrop.Props>(({ className, ...props }, ref) => (
	<SheetPrimitive.Backdrop
		ref={ref}
		data-slot="sheet-overlay"
		className={cn(
			'fixed inset-0 z-[1000] bg-black/40 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0',
			className
		)}
		{...props}
	/>
));
SheetOverlay.displayName = 'SheetOverlay';

const sheetVariants = cva(
	'fixed z-[1000] flex flex-col gap-4 overflow-y-auto bg-card p-6 text-card-foreground hairline-ring ring-border shadow-xl shadow-black/6.5 outline-none transition-[translate,opacity] duration-300 ease-in-out',
	{
		variants: {
			side: {
				top: 'inset-x-0 top-0 max-h-[85dvh] data-starting-style:-translate-y-full data-ending-style:-translate-y-full',
				bottom: 'inset-x-0 bottom-0 max-h-[85dvh] data-starting-style:translate-y-full data-ending-style:translate-y-full',
				left: 'inset-y-0 left-0 h-full w-[calc(100%-3rem)] sm:max-w-sm data-starting-style:-translate-x-full data-ending-style:-translate-x-full',
				right: 'inset-y-0 right-0 h-full w-[calc(100%-3rem)] sm:max-w-sm data-starting-style:translate-x-full data-ending-style:translate-x-full'
			}
		},
		defaultVariants: {
			side: 'right'
		}
	}
);

interface SheetContentProps extends SheetPrimitive.Popup.Props, VariantProps<typeof sheetVariants> {
	showCloseButton?: boolean;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
	({ side = 'right', className, children, showCloseButton = true, ...props }, ref) => {
		const t = useTranslations();
		return (
			<SheetPortal>
				<SheetOverlay />
				<SheetPrimitive.Viewport data-slot="sheet-viewport" className="fixed inset-0 z-[1000]">
					<SheetPrimitive.Popup
						ref={ref}
						data-slot="sheet-content"
						data-side={side}
						className={cn(sheetVariants({ side }), className)}
						{...props}
					>
						{children}
						{showCloseButton && (
							<SheetPrimitive.Close
								data-slot="sheet-close"
								aria-label={t('common.CLOSE')}
								className={cn(
									buttonVariants({ variant: 'ghost', size: 'icon' }),
									'absolute right-3 top-3 text-muted-foreground'
								)}
							>
								<X />
							</SheetPrimitive.Close>
						)}
					</SheetPrimitive.Popup>
				</SheetPrimitive.Viewport>
			</SheetPortal>
		);
	}
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="sheet-header"
		className={cn('flex flex-col gap-1.5 pr-8 text-center sm:text-left', className)}
		{...props}
	/>
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="sheet-footer"
		className={cn('mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
		{...props}
	/>
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<HTMLHeadingElement, SheetPrimitive.Title.Props>(({ className, ...props }, ref) => (
	<SheetPrimitive.Title
		ref={ref}
		data-slot="sheet-title"
		className={cn('text-lg font-semibold text-foreground text-balance', className)}
		{...props}
	/>
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<HTMLParagraphElement, SheetPrimitive.Description.Props>(
	({ className, ...props }, ref) => (
		<SheetPrimitive.Description
			ref={ref}
			data-slot="sheet-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
);
SheetDescription.displayName = 'SheetDescription';

/**
 * A sheet that floats 8px from the window edges, as the task drawer and the project sheet draw it. It slides by its
 * width plus that gap, so nothing of it is left on screen, out in the DS's easing and back faster. Callers set
 * the width.
 */
const floatingSheetSurface =
	'inset-y-2 right-2 h-auto gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:translate-x-[calc(100%+1rem)] data-ending-style:translate-x-[calc(100%+1rem)] data-ending-style:duration-200 data-ending-style:ease-in';

export {
	floatingSheetSurface,
	Sheet,
	SheetPortal,
	SheetOverlay,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription
};
