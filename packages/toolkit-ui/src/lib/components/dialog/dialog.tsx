'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils/utils';
import { CloseIcon } from '@/lib/svgs/close';
import { withKitContainer } from '../portal-container';

const ShadCnDialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = withKitContainer(DialogPrimitive.Portal);

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = ({
	ref,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
	ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Overlay>>;
}) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			'fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			className
		)}
		{...props}
	/>
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// The shadow root an element is rendered in, if any.
function shadowRootOf(element: HTMLElement): ShadowRoot | null {
	const root = element.getRootNode();
	if (root instanceof ShadowRoot) {
		return root;
	}
	return null;
}

// Radix's first focus compares document.activeElement, which stays the shadow host inside a shadow root: it then
// focuses every element of the dialog in turn, and a tab selects itself on the way. There, the dialog takes the focus
// itself, as Radix does when nothing in it can be focused. In a page nothing changes.
function focusDialogInShadowRoot(event: Event) {
	const content = event.target;
	if (!(content instanceof HTMLElement)) {
		return;
	}
	if (event.defaultPrevented) {
		return;
	}
	if (!shadowRootOf(content)) {
		return;
	}
	event.preventDefault();
	content.focus();
}

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]';

// Drawn on screen where the browser cannot tell (no checkVisibility): no display: none on the element or up to the
// dialog.
function isRendered(element: HTMLElement, content: HTMLElement): boolean {
	const view = element.ownerDocument.defaultView;
	for (let node: HTMLElement | null = element; node; node = node === content ? null : node.parentElement) {
		if (view?.getComputedStyle(node).display === 'none') {
			return false;
		}
	}
	return true;
}

// Whether Tab reaches the element: in the tab order, enabled, and shown (not under a hidden or inert ancestor, and not
// hidden by its styles: visibility, or display up to the dialog).
function isTabbable(element: HTMLElement, content: HTMLElement): boolean {
	if (element.tabIndex < 0) {
		return false;
	}
	if (element.hasAttribute('disabled')) {
		return false;
	}
	if (element.closest('[hidden], [inert]')) {
		return false;
	}
	if (element.ownerDocument.defaultView?.getComputedStyle(element).visibility === 'hidden') {
		return false;
	}
	if (typeof element.checkVisibility === 'function') {
		return element.checkVisibility();
	}
	return isRendered(element, content);
}

// The elements Tab reaches in the dialog, in order: a hidden control is skipped, as the browser skips it.
function tabbableIn(content: HTMLElement): HTMLElement[] {
	const candidates = Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE));
	return candidates.filter((element) => isTabbable(element, content));
}

// Radix's Tab trap compares document.activeElement too: inside a shadow root, Tab from the last element, or Shift+Tab
// from the first, would leave the dialog for the page. There, the dialog loops its focus itself.
function keepTabInShadowDialog(event: React.KeyboardEvent<HTMLElement>) {
	if (event.key !== 'Tab') {
		return;
	}
	const content = event.currentTarget;
	const shadow = shadowRootOf(content);
	if (!shadow) {
		return;
	}
	const tabbable = tabbableIn(content);
	const first = tabbable[0];
	const last = tabbable[tabbable.length - 1];
	if (!first) {
		event.preventDefault();
		return;
	}
	const focused = shadow.activeElement;
	const onFirst = focused === first || focused === content;
	const leavesForward = !event.shiftKey && focused === last;
	const leavesBackward = event.shiftKey && onFirst;
	if (leavesForward) {
		event.preventDefault();
		first.focus();
		return;
	}
	if (leavesBackward) {
		event.preventDefault();
		last.focus();
	}
}

const DialogContent = ({
	ref,
	className,
	children,
	onOpenAutoFocus,
	onKeyDown,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
	ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Content>>;
}) => {
	const openAutoFocus = (event: Event) => {
		onOpenAutoFocus?.(event);
		focusDialogInShadowRoot(event);
	};
	const keyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		keepTabInShadowDialog(event);
	};
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ref}
				className={cn(
					'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] backdrop-blur-xl gap-4 border dark:border-slate-800 bg-[hsl(var(--background))] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg text-slate-500 dark:text-white',
					className
				)}
				onOpenAutoFocus={openAutoFocus}
				onKeyDown={keyDown}
				{...props}
			>
				{children}
				<DialogPrimitive.Close className="absolute right-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
					<CloseIcon size={24} className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPortal>
	);
};
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = ({
	ref,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & {
	ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Title>>;
}) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn('text-lg font-semibold leading-none tracking-tight', className)}
		{...props}
	/>
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = ({
	ref,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & {
	ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Description>>;
}) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn('text-sm text-[hsl(var(--muted-foreground))]', className)}
		{...props}
	/>
);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
	ShadCnDialog,
	DialogPortal,
	DialogOverlay,
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription
};
