import type { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components/duplicated-components/_button';

/** Bars that shorten row by row, so the placeholder reads as a list and not as a grid. */
const SKELETON_WIDTHS = ['w-[78%]', 'w-[64%]', 'w-[86%]', 'w-[58%]', 'w-[72%]', 'w-[50%]'];

const BAR_CLASS = 'h-2.5 rounded-full bg-foreground/[0.06]';

export function NotificationRowsSkeleton({ rows = SKELETON_WIDTHS.length }: Readonly<{ rows?: number }>) {
	const widths = SKELETON_WIDTHS.slice(0, rows);

	return (
		<div aria-hidden="true" className="flex flex-col p-1.5">
			{widths.map((width) => (
				<div key={width} className="flex items-start gap-3 px-3 py-2.5">
					<span className="size-7 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
						<span className={cn(BAR_CLASS, 'animate-pulse', width)} />
						<span className={cn(BAR_CLASS, 'w-2/5 animate-pulse bg-foreground/[0.04]')} />
					</div>
				</div>
			))}
		</div>
	);
}

/** The panel while its code loads: the header's height and the same rows as the list's own loading state. */
export function NotificationPanelSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col">
			<div className="flex h-11 items-center px-4">
				<span className={cn(BAR_CLASS, 'w-16 animate-pulse')} />
			</div>
			<div className="px-3 pb-2">
				<span className="block h-8 w-full rounded-lg bg-foreground/[0.04]" />
			</div>
			<NotificationRowsSkeleton rows={4} />
		</div>
	);
}

/**
 * The empty inbox previews what will fill it: three ghost rows with the real row's shape, then what lands here.
 */
export function NotificationEmptyState({
	icon,
	title,
	message
}: Readonly<{ icon: ReactNode; title: string; message: string }>) {
	return (
		<div className="flex flex-col items-center gap-4 px-6 pb-8 pt-5 text-center">
			<div aria-hidden="true" className="flex w-56 flex-col gap-1.5">
				{SKELETON_WIDTHS.slice(0, 3).map((width, index) => (
					<div
						key={width}
						className={cn(
							'flex items-center gap-2.5 rounded-lg bg-card px-2.5 py-2 hairline-ring ring-border',
							index > 0 && 'opacity-60',
							index > 1 && 'opacity-30'
						)}
					>
						<span className="size-4 shrink-0 rounded-full bg-foreground/[0.07]" />
						<span className={cn(BAR_CLASS, width)} />
					</div>
				))}
			</div>
			<div className="flex flex-col items-center gap-1">
				<span className="mb-1 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground keycap-3d [&_svg]:size-4">
					{icon}
				</span>
				<p className="text-[13px] font-medium text-foreground text-balance">{title}</p>
				<p className="max-w-64 text-xs text-muted-foreground text-balance">{message}</p>
			</div>
		</div>
	);
}

export function NotificationErrorState({
	message,
	retryLabel,
	onRetry
}: Readonly<{ message: string; retryLabel: string; onRetry: () => void }>) {
	return (
		<div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
			<p className="text-[13px] text-muted-foreground text-balance">{message}</p>
			<Button type="button" variant="outline" size="sm" onClick={onRetry}>
				{retryLabel}
			</Button>
		</div>
	);
}
