'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { SKELETON_BAR } from './recipes';

/** A failed read says so in place of the block that could not load, with a retry; the rest of the page stays. */
export function DashboardErrorNotice({
	title,
	onRetry,
	className
}: Readonly<{ title?: string; onRetry: () => void; className?: string }>) {
	const t = useTranslations();
	return (
		<Notice
			tone="error"
			title={title ?? t('dashboard.states.ERROR_TITLE')}
			description={t('dashboard.states.ERROR_MESSAGE')}
			actions={
				<Button type="button" variant="outline" size="default" onClick={onRetry}>
					{t('pages.unauthorized.TRY_AGAIN')}
				</Button>
			}
			className={className}
		/>
	);
}

/**
 * An empty period inside a block that keeps its frame: one sentence over the chart or in place of the rows, an
 * optional action that changes what is shown (period, filters). Nothing is drawn as if it were data.
 */
export function BlockEmptyMessage({
	title,
	message,
	action,
	className
}: Readonly<{ title: string; message?: ReactNode; action?: ReactNode; className?: string }>) {
	return (
		<div className={cn('flex flex-col items-center justify-center gap-1 px-6 py-10 text-center', className)}>
			<p className="text-[13px] font-medium text-foreground text-balance">{title}</p>
			{message && <p className="max-w-sm text-xs text-muted-foreground text-pretty">{message}</p>}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}

const CHART_SKELETON_HEIGHTS = [38, 62, 48, 74, 30, 56, 68, 42, 60, 34, 52, 46];

export function DayBarsSkeleton({ heightClassName = 'h-48' }: Readonly<{ heightClassName?: string }>) {
	return (
		<div className="flex flex-col gap-2" aria-hidden="true">
			<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
				<div className={cn('flex w-8 flex-col justify-between py-1', heightClassName)}>
					<span className={cn('h-2 w-5 self-end', SKELETON_BAR)} />
					<span className={cn('h-2 w-5 self-end', SKELETON_BAR)} />
					<span className={cn('h-2 w-4 self-end', SKELETON_BAR)} />
				</div>
				<div className={cn('flex items-end', heightClassName)}>
					{CHART_SKELETON_HEIGHTS.map((height, index) => (
						<div key={index} className="flex h-full flex-1 items-end justify-center px-[12%]">
							<span
								className="block w-full max-w-8 animate-pulse rounded-t-[4px] bg-foreground/[0.05]"
								style={{ height: `${height}%` }}
							/>
						</div>
					))}
				</div>
			</div>
			<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
				<span className="w-8" />
				<span className={cn('h-2 w-full', SKELETON_BAR)} />
			</div>
		</div>
	);
}

/** Rows of a table while it loads: the real row height, an avatar circle and bars that step down in width. */
export function RowsSkeleton({
	rows = 6,
	gridClassName,
	cellCount,
	withAvatar = true,
	valueCellClassNames = []
}: Readonly<{
	rows?: number;
	gridClassName: string;
	cellCount: number;
	withAvatar?: boolean;
	/** Per value cell, after the name cell: the same breakpoint classes as the real cells (`max-sm:hidden`). */
	valueCellClassNames?: ReadonlyArray<string | undefined>;
}>) {
	const valueCellKeys = Array.from({ length: Math.max(cellCount - 1, 0) }, (_, cellIndex) => `cell-${cellIndex}`);
	const rowKeys = Array.from({ length: rows }, (_, rowIndex) => `row-${rowIndex}`);
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{rowKeys.map((rowKey, rowIndex) => {
				const nameWidth = `${Math.max(35, 80 - rowIndex * 8)}%`;
				return (
					<div key={rowKey} className={cn(gridClassName, 'min-h-11')}>
						<span className="flex min-w-0 items-center gap-2">
							{withAvatar && (
								<span className="size-6 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
							)}
							<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: nameWidth }} />
						</span>
						{valueCellKeys.map((cellKey, cellIndex) => (
							<span
								key={cellKey}
								className={cn('ml-auto h-2.5 w-12', SKELETON_BAR, valueCellClassNames[cellIndex])}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}
