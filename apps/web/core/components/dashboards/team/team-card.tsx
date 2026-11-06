'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { DASHBOARD_SURFACE, SECTION_META, SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import { ArrowRight } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

/** The two rows that hold a chart or a list keep one height from lg; their bodies scroll inside. */
export const TALL_ROW = 'lg:h-[24rem]';

export const CARD_BODY = 'px-4 py-3';

/** A card that a link scrolls to takes the focus after the scroll, so keyboard users land on it too. */
function anchorTabIndexOf(id: string | undefined) {
	if (!id) {
		return undefined;
	}
	return -1;
}

const FOOTER_ACTION =
	'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5 [&_svg]:text-muted-foreground';

/**
 * Every card of the team dashboard: a 48px header (title, muted meta, the card's own control), a body, an optional
 * 40px footer. Header, body and footer are one surface, told apart by type and spacing, never by a line. One component
 * so no card can drift from the others.
 */
export function TeamCard({
	id,
	title,
	icon,
	meta,
	control,
	footer,
	isBusy = false,
	scrolls = false,
	className,
	bodyClassName,
	children
}: Readonly<{
	id?: string;
	title: string;
	icon?: ReactNode;
	meta?: ReactNode;
	control?: ReactNode;
	footer?: ReactNode;
	isBusy?: boolean;
	/** The body fills the card and scrolls inside it instead of growing the row. */
	scrolls?: boolean;
	className?: string;
	bodyClassName?: string;
	children: ReactNode;
}>) {
	return (
		<section
			id={id}
			tabIndex={anchorTabIndexOf(id)}
			aria-label={title}
			aria-busy={isBusy}
			className={cn(DASHBOARD_SURFACE, 'flex min-h-0 min-w-0 flex-col outline-none', className)}
		>
			<header className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
				<div className="flex min-w-0 items-center gap-2">
					{icon}
					<h2 className={cn(SECTION_TITLE, 'truncate')}>{title}</h2>
					{meta && <span className={cn(SECTION_META, 'truncate')}>{meta}</span>}
				</div>
				{control && <div className="flex shrink-0 flex-wrap items-center gap-2">{control}</div>}
			</header>
			<div className={cn(CARD_BODY, 'min-h-0 flex-1', scrolls && 'overflow-y-auto', bodyClassName)}>
				{children}
			</div>
			{footer && <div className="flex h-10 shrink-0 items-center justify-center">{footer}</div>}
		</section>
	);
}

export function CardFooterLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
	return (
		<Link href={href} prefetch={false} className={FOOTER_ACTION}>
			{children}
			<ArrowRight aria-hidden="true" />
		</Link>
	);
}

export function CardFooterButton({
	onClick,
	withArrow = false,
	children
}: Readonly<{ onClick: () => void; withArrow?: boolean; children: ReactNode }>) {
	return (
		<button type="button" onClick={onClick} className={FOOTER_ACTION}>
			{children}
			{withArrow && <ArrowRight aria-hidden="true" />}
		</button>
	);
}

export function CardGlyph({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<span
			aria-hidden="true"
			className="keycap-3d flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground [&_svg]:size-4"
		>
			{children}
		</span>
	);
}
