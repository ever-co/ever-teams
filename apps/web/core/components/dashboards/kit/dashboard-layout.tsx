'use client';

import type { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { ChevronRight } from '@/core/components/icons';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { PageUpdatingBar } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_SURFACE, SECTION_HEADER, SECTION_META, SECTION_TITLE, SKELETON_BAR } from './recipes';

/**
 * The toolbar band of every report, in the shell's `mainHeaderSlot`: the title with its meta figures and the
 * page actions (export, a primary) on the first row, the period and the filters on the second, the view choices at
 * its right. Both rows keep their height while data loads.
 */
export function DashboardToolbar({
	title,
	meta,
	isMetaLoading = false,
	actions,
	controls,
	trailingControls,
	belowControls,
	isUpdating = false,
	updatingLabel = ''
}: Readonly<{
	title: ReactNode;
	meta?: ReactNode;
	isMetaLoading?: boolean;
	actions?: ReactNode;
	controls?: ReactNode;
	trailingControls?: ReactNode;
	/** Applied filters, shown as chips under the controls only when there are some. */
	belowControls?: ReactNode;
	/** The page's data is being read again while the previous figures stay on screen. */
	isUpdating?: boolean;
	updatingLabel?: string;
}>) {
	const hasControls = Boolean(controls) || Boolean(trailingControls);
	return (
		<div className="relative px-4">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
					{isMetaLoading && <span className={cn('h-2.5 w-24 self-center', SKELETON_BAR)} />}
					{!isMetaLoading && meta && <span className={SECTION_META}>{meta}</span>}
				</div>
				{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
			</div>
			{hasControls && (
				<div className="flex flex-wrap items-center justify-between gap-2 pb-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{controls}</div>
					{trailingControls && <div className="flex flex-wrap items-center gap-2">{trailingControls}</div>}
				</div>
			)}
			{belowControls}
			<PageUpdatingBar isUpdating={isUpdating} label={updatingLabel} />
		</div>
	);
}

/** A block of a dashboard: one surface, a 44px header with its title, meta and own controls, then its body. */
export function DashboardSection({
	title,
	meta,
	actions,
	children,
	className,
	bodyClassName,
	ariaLabel
}: Readonly<{
	title?: ReactNode;
	meta?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
	bodyClassName?: string;
	ariaLabel?: string;
}>) {
	const hasHeader = Boolean(title) || Boolean(actions);
	return (
		<section aria-label={ariaLabel} className={cn(DASHBOARD_SURFACE, className)}>
			{hasHeader && (
				<header className={SECTION_HEADER}>
					<div className="flex min-w-0 items-baseline gap-2">
						{title && <h2 className={SECTION_TITLE}>{title}</h2>}
						{meta && <span className={SECTION_META}>{meta}</span>}
					</div>
					{actions && <div className="flex items-center gap-2">{actions}</div>}
				</header>
			)}
			<div className={bodyClassName}>{children}</div>
		</section>
	);
}

/** Column labels of a report table, on the same grid template as its rows. */
export function ReportHeaderRow({
	gridClassName,
	children,
	className
}: Readonly<{ gridClassName: string; children: ReactNode; className?: string }>) {
	return (
		<div
			role="row"
			className={cn(
				gridClassName,
				'sticky top-0 z-[1] min-h-9 bg-card text-xs font-medium text-muted-foreground hairline-b border-border',
				className
			)}
		>
			{children}
		</div>
	);
}

/** The closing row of a report table: the count under the first column, the sums under the figures. */
export function ReportTotalsRow({ gridClassName, children }: Readonly<{ gridClassName: string; children: ReactNode }>) {
	return (
		<div
			role="row"
			className={cn(gridClassName, 'min-h-10 text-[13px] font-medium text-foreground hairline-t border-border')}
		>
			{children}
		</div>
	);
}

/**
 * A group of rows that opens in place (a day, a member, a project): the header row carries its own totals and a
 * `GroupToggle`, the rows below grow in with the height motion. Nothing else on the page moves. The header is not a
 * button itself, so it can also hold a checkbox or actions.
 */
export function ReportGroup({
	isOpen,
	header,
	children,
	headerClassName,
	className
}: Readonly<{
	isOpen: boolean;
	header: ReactNode;
	children: ReactNode;
	headerClassName: string;
	className?: string;
}>) {
	return (
		<div role="rowgroup" className={className}>
			<div role="row" className={cn(headerClassName, 'min-h-11')}>
				{header}
			</div>
			<AnimatedHeight>{isOpen && <div className="hairline-t border-border">{children}</div>}</AnimatedHeight>
		</div>
	);
}

/** The disclosure of a group: the chevron and the group's name in one button that fills its cell. */
export function GroupToggle({
	isOpen,
	onToggle,
	children,
	className
}: Readonly<{ isOpen: boolean; onToggle: () => void; children: ReactNode; className?: string }>) {
	return (
		<button
			type="button"
			aria-expanded={isOpen}
			onClick={onToggle}
			className={cn(
				'-mx-1.5 flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25',
				className
			)}
		>
			<ChevronRight
				aria-hidden="true"
				className={cn(
					'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
					isOpen && 'rotate-90'
				)}
			/>
			{children}
		</button>
	);
}
