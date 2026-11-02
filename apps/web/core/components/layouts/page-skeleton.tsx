'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

const PILL = 'h-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.05]';

/**
 * Data being read again while the page keeps showing what it has: a thin line sliding along the bottom edge of the
 * toolbar band. The content stays in place; nothing flashes back to a skeleton.
 */
export function PageUpdatingBar({ isUpdating, label }: Readonly<{ isUpdating: boolean; label: string }>) {
	if (!isUpdating) {
		return null;
	}
	return (
		<span
			role="status"
			aria-label={label}
			className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
		>
			<span className="block h-full w-1/3 animate-[shimmer_1.1s_ease-in-out_infinite] rounded-full bg-primary/70" />
		</span>
	);
}

/** The top bar's trail while a page loads: the page icon's slot and two crumbs, on the real breadcrumb's line. */
export function BreadcrumbSkeleton() {
	return (
		<div className="flex min-w-0 items-center gap-2" aria-hidden="true">
			<span className="size-4 shrink-0 rounded-[5px] bg-foreground/[0.06]" />
			<span className={cn('h-2.5 w-20', BAR)} />
			<span className={cn('h-2.5 w-28', BAR)} />
		</div>
	);
}

/** Pills of a toolbar row, each as wide as the control it stands for. */
export function ToolbarPills({ widths }: Readonly<{ widths: ReadonlyArray<string> }>) {
	return (
		<>
			{widths.map((width, index) => (
				<span key={`${width}-${index}`} className={cn(PILL, width)} />
			))}
		</>
	);
}

/**
 * The toolbar band of a page while it loads, on the same rows as the real one: the title (written, since it does not
 * depend on data) with a muted meta bar and the actions on the first row, the controls on the second.
 */
export function ToolbarBandSkeleton({
	title,
	actionWidths = [],
	controlWidths = [],
	trailingWidths = []
}: Readonly<{
	title?: string;
	actionWidths?: ReadonlyArray<string>;
	controlWidths?: ReadonlyArray<string>;
	trailingWidths?: ReadonlyArray<string>;
}>) {
	const hasTitle = Boolean(title);
	const hasSecondRow = controlWidths.length > 0 || trailingWidths.length > 0;
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					{hasTitle && <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>}
					{!hasTitle && <span className={cn('h-4 w-40 self-center', BAR)} />}
					<span className={cn('h-2.5 w-24 self-center', BAR)} />
				</div>
				<div className="flex items-center gap-2">
					<ToolbarPills widths={actionWidths} />
				</div>
			</div>
			{hasSecondRow && (
				<div className="flex flex-wrap items-center justify-between gap-2 pb-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
						<ToolbarPills widths={controlWidths} />
					</div>
					<div className="flex items-center gap-2">
						<ToolbarPills widths={trailingWidths} />
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * The one frame of a page skeleton: the same `PageLayout` as the page, so the top bar, the toolbar band and the
 * content start where the loaded page puts them and nothing moves when data arrives. The route's `loading.tsx`, the
 * authentication wait and the page's own first load all render the same skeleton built on this frame.
 */
export function PageSkeletonFrame({
	toolbar,
	children,
	className
}: Readonly<{ toolbar?: ReactNode; children?: ReactNode; className?: string }>) {
	const t = useTranslations();
	return (
		<PageLayout
			title={t('common.LOADING')}
			breadcrumb={<BreadcrumbSkeleton />}
			mainHeaderSlot={toolbar}
			className={className}
		>
			<div role="status" aria-live="polite" aria-busy="true" className="contents">
				<span className="sr-only">{t('common.LOADING')}</span>
				{children}
			</div>
		</PageLayout>
	);
}
