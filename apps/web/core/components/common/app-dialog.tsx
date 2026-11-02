'use client';

import { useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { commandKeycapClass } from '@/core/components/common/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronRight, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

const WIDTHS = {
	sm: 'sm:max-w-[26rem]',
	md: 'sm:max-w-[34rem]',
	lg: 'sm:max-w-[42rem]'
} as const;

export type AppDialogWidth = keyof typeof WIDTHS;

/**
 * Linear's dialogs sit in the top part of the window, so a dialog that grows (a long description, an unfolded
 * list) grows downwards and the header never moves. On phones the dialog docks to the bottom edge.
 */
const POSITION =
	'flex flex-col gap-0 overflow-hidden p-0 top-[max(1rem,10dvh)] translate-y-0 max-h-[min(46rem,calc(100dvh-max(2rem,12dvh)))] max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:max-h-[92dvh] max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)]';

/** Marks the element a dialog focuses when it opens (the first field, or Cancel in a confirmation). */
const INITIAL_FOCUS_ATTRIBUTE = 'data-initial-focus';

export const APP_DIALOG_BODY = 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5';

export const APP_DIALOG_FOOTER = 'flex shrink-0 flex-wrap items-center gap-2 hairline-t border-border px-5 py-3';

interface AppDialogProps {
	open: boolean;
	onClose: () => void;
	width?: AppDialogWidth;
	/** Clicks on the overlay keep the dialog open, so a half-filled form is never lost by a stray click. */
	keepOpenOnOutsideClick?: boolean;
	/** False when the person must answer through the dialog's own buttons: Escape and the overlay do nothing. */
	dismissible?: boolean;
	className?: string;
	children: ReactNode;
}

export function AppDialog({
	open,
	onClose,
	width = 'md',
	keepOpenOnOutsideClick = false,
	dismissible = true,
	className,
	children
}: AppDialogProps) {
	const popupRef = useRef<HTMLDivElement>(null);
	const keepsOpenOnOverlay = keepOpenOnOutsideClick || !dismissible;
	const handleOpenChange = (nextOpen: boolean) => {
		const closesByItself = !nextOpen && dismissible;
		if (closesByItself) {
			onClose();
		}
	};
	const markedElement = () => {
		const marked = popupRef.current?.querySelector<HTMLElement>(`[${INITIAL_FOCUS_ATTRIBUTE}]`);
		return marked ?? true;
	};
	return (
		<Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={keepsOpenOnOverlay}>
			<DialogContent
				ref={popupRef}
				initialFocus={markedElement}
				showCloseButton={false}
				className={cn(POSITION, WIDTHS[width], className)}
			>
				{children}
			</DialogContent>
		</Dialog>
	);
}

interface AppDialogHeaderProps {
	title: string;
	context?: ReactNode;
	/** Without it the header has no close button, for a dialog answered only through its own buttons. */
	onClose?: () => void;
	actions?: ReactNode;
	className?: string;
}

export function AppDialogHeader({ title, context, onClose, actions, className }: AppDialogHeaderProps) {
	const t = useTranslations();
	const hasContext = Boolean(context);
	const hasCloseButton = Boolean(onClose);
	return (
		<div className={cn('flex h-13 shrink-0 items-center gap-1.5 pr-3 pl-5', className)}>
			{hasContext && (
				<>
					<span className="inline-flex h-6 max-w-52 min-w-0 shrink items-center gap-1.5 rounded-md bg-card px-1.5 text-[13px] text-muted-foreground hairline-ring ring-border [&_svg]:size-3.5 [&_svg]:shrink-0">
						{context}
					</span>
					<ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				</>
			)}
			<DialogTitle className="min-w-0 truncate text-[13px] font-medium text-foreground">{title}</DialogTitle>
			<span className="ml-auto flex shrink-0 items-center gap-1">
				{actions}
				{hasCloseButton && (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onClose}
						aria-label={t('common.CLOSE')}
						className="text-muted-foreground"
					>
						<X />
					</Button>
				)}
			</span>
		</div>
	);
}

export { DialogDescription as AppDialogDescription };

export function AppDialogShortcut({ keys, label }: Readonly<{ keys: string[]; label: string }>) {
	return (
		<span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
			<span className="inline-flex items-center gap-0.5" aria-hidden="true">
				{keys.map((key) => (
					<kbd key={key} className={commandKeycapClass}>
						{key}
					</kbd>
				))}
			</span>
			{label}
		</span>
	);
}
