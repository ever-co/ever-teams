'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, ChevronUp, Expand, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { Sheet, SheetContent, SheetTitle, floatingSheetSurface } from './sheet';

const SHEET_WIDTHS = {
	md: 'w-[min(40rem,calc(100vw-1rem))]',
	lg: 'w-[min(50rem,calc(100vw-1rem))]'
} as const;

export type RecordSheetWidth = keyof typeof SHEET_WIDTHS;

interface RecordSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The sheet's accessible name; the visible header is the bar. */
	title: string;
	width?: RecordSheetWidth;
	children: ReactNode;
}

/**
 * A record opened over the list it belongs to (a client, an invoice), as the task drawer is: a floating sheet 8px from
 * the window's edges that slides from the right, the list left in place under it.
 */
export function RecordSheet({ open, onOpenChange, title, width = 'md', children }: Readonly<RecordSheetProps>) {
	const popupRef = useRef<HTMLDivElement>(null);
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				ref={popupRef}
				side="right"
				showCloseButton={false}
				initialFocus={popupRef}
				className={cn(floatingSheetSurface, SHEET_WIDTHS[width], 'flex flex-col')}
			>
				<SheetTitle className="sr-only">{title}</SheetTitle>
				{children}
			</SheetContent>
		</Sheet>
	);
}

interface RecordSheetBarProps {
	/** What the sheet shows, at the start of the bar (a crumb, a number). */
	children?: ReactNode;
	/** The record's own page; the bar offers to open it. */
	pageHref?: string;
	onPrevious?: () => void;
	onNext?: () => void;
	onClose: () => void;
}

/** The sheet's 48px bar: what it shows on the left; previous and next, the full page and close on the right. */
export function RecordSheetBar({ children, pageHref, onPrevious, onNext, onClose }: Readonly<RecordSheetBarProps>) {
	const t = useTranslations();
	const hasStepping = Boolean(onPrevious) || Boolean(onNext);
	return (
		<div className="flex h-12 shrink-0 items-center gap-1 px-3">
			<div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-muted-foreground">{children}</div>
			{hasStepping && (
				<div className="flex items-center">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onPrevious}
						disabled={!onPrevious}
						aria-label={t('recordSheet.PREVIOUS')}
						title={t('recordSheet.PREVIOUS_HINT')}
					>
						<ChevronUp />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onNext}
						disabled={!onNext}
						aria-label={t('recordSheet.NEXT')}
						title={t('recordSheet.NEXT_HINT')}
					>
						<ChevronDown />
					</Button>
				</div>
			)}
			{pageHref && (
				<Button asChild variant="ghost" size="icon-sm">
					<Link href={pageHref} aria-label={t('recordSheet.OPEN_PAGE')} title={t('recordSheet.OPEN_PAGE')}>
						<Expand />
					</Link>
				</Button>
			)}
			<Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('common.CLOSE')}>
				<X />
			</Button>
		</div>
	);
}

function isTyping(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	const tag = target.tagName;
	const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
	return isField || target.isContentEditable;
}

function hasModifier(event: KeyboardEvent) {
	return event.metaKey || event.ctrlKey || event.altKey;
}

/** J and K walk the list a sheet was opened from, while it is open and nobody is typing. */
export function useRecordSheetKeys({
	enabled,
	onPrevious,
	onNext
}: Readonly<{ enabled: boolean; onPrevious?: () => void; onNext?: () => void }>) {
	useEffect(() => {
		if (!enabled) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			const isIgnored = hasModifier(event) || isTyping(event.target);
			if (isIgnored) {
				return;
			}
			const key = event.key.toLowerCase();
			if (key === 'k' && onPrevious) {
				event.preventDefault();
				onPrevious();
			}
			if (key === 'j' && onNext) {
				event.preventDefault();
				onNext();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [enabled, onNext, onPrevious]);
}
