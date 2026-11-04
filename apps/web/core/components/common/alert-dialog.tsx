'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '@/core/lib/helpers';
import { buttonVariants } from '../duplicated-components/_button';
import { composeRefs, renderFromAsChild } from './base-ui';
import { dialogSurface, dialogTitleText } from './dialog';

type CancelButtonRef = React.RefObject<HTMLButtonElement | null>;

/** Radix moved the initial focus to the Cancel button, so a stray Enter never confirms a destructive action. */
const AlertDialogCancelRefContext = React.createContext<CancelButtonRef | null>(null);

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

interface AlertDialogTriggerProps extends AlertDialogPrimitive.Trigger.Props {
	asChild?: boolean;
}

const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<AlertDialogPrimitive.Trigger
				ref={ref}
				data-slot="alert-dialog-trigger"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</AlertDialogPrimitive.Trigger>
		);
	}
);
AlertDialogTrigger.displayName = 'AlertDialogTrigger';

const AlertDialogOverlay = React.forwardRef<HTMLDivElement, AlertDialogPrimitive.Backdrop.Props>(
	({ className, ...props }, ref) => (
		<AlertDialogPrimitive.Backdrop
			ref={ref}
			data-slot="alert-dialog-overlay"
			className={cn(
				'fixed inset-0 z-[1000] bg-black/20 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-150',
				className
			)}
			{...props}
		/>
	)
);
AlertDialogOverlay.displayName = 'AlertDialogOverlay';

const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogPrimitive.Popup.Props>(
	({ className, initialFocus, ...props }, ref) => {
		const cancelButtonRef = React.useRef<HTMLButtonElement | null>(null);
		const focusCancelButtonFirst = React.useCallback(() => cancelButtonRef.current, []);
		const resolvedInitialFocus = initialFocus ?? focusCancelButtonFirst;
		return (
			<AlertDialogPortal>
				<AlertDialogOverlay />
				<AlertDialogPrimitive.Viewport data-slot="alert-dialog-viewport" className="fixed inset-0 z-[1000]">
					<AlertDialogCancelRefContext.Provider value={cancelButtonRef}>
						<AlertDialogPrimitive.Popup
							ref={ref}
							data-slot="alert-dialog-content"
							initialFocus={resolvedInitialFocus}
							className={cn(
								dialogSurface,
								'fixed left-[50%] top-[50%] z-[1000] grid w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4',
								className
							)}
							{...props}
						/>
					</AlertDialogCancelRefContext.Provider>
				</AlertDialogPrimitive.Viewport>
			</AlertDialogPortal>
		);
	}
);
AlertDialogContent.displayName = 'AlertDialogContent';

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div data-slot="alert-dialog-header" className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="alert-dialog-footer"
		className={cn('flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end', className)}
		{...props}
	/>
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, AlertDialogPrimitive.Title.Props>(
	({ className, ...props }, ref) => (
		<AlertDialogPrimitive.Title
			ref={ref}
			data-slot="alert-dialog-title"
			className={cn(dialogTitleText, className)}
			{...props}
		/>
	)
);
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, AlertDialogPrimitive.Description.Props>(
	({ className, ...props }, ref) => (
		<AlertDialogPrimitive.Description
			ref={ref}
			data-slot="alert-dialog-description"
			className={cn('text-[13px] text-muted-foreground', className)}
			{...props}
		/>
	)
);
AlertDialogDescription.displayName = 'AlertDialogDescription';

interface AlertDialogCloseProps extends AlertDialogPrimitive.Close.Props {
	asChild?: boolean;
}

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogCloseProps>(
	({ className, asChild, children, render, nativeButton, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<AlertDialogPrimitive.Close
				ref={ref}
				data-slot="alert-dialog-action"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				className={cn(buttonVariants({ size: 'default' }), 'rounded-full px-3.5 text-[13px]', className)}
				{...props}
			>
				{composed.children}
			</AlertDialogPrimitive.Close>
		);
	}
);
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogCloseProps>(
	({ className, asChild, children, render, nativeButton, ...props }, ref) => {
		const cancelButtonRef = React.useContext(AlertDialogCancelRefContext);
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		const registerCancelButton = composeRefs<HTMLButtonElement>(ref, cancelButtonRef ?? undefined);
		return (
			<AlertDialogPrimitive.Close
				ref={registerCancelButton}
				data-slot="alert-dialog-cancel"
				nativeButton={resolvedNativeButton}
				render={composed.render}
				className={cn(
					buttonVariants({ variant: 'ghost', size: 'default' }),
					'text-[13px] text-muted-foreground',
					className
				)}
				{...props}
			>
				{composed.children}
			</AlertDialogPrimitive.Close>
		);
	}
);
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
	AlertDialog,
	AlertDialogPortal,
	AlertDialogOverlay,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel
};
