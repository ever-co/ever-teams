import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';

const HEADER_ACTION_WIDTHS = ['w-28', 'w-32', 'w-8'];

const LINE_KEYS = ['first', 'second', 'third'];

const TOTAL_KEYS = ['subtotal', 'tax', 'total'];

export function InvoiceDetailHeaderSkeleton() {
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2.5">
						<span className={cn('h-5 w-36', SKELETON_BAR)} />
						<span className="h-6 w-16 animate-pulse rounded-md bg-foreground/[0.05]" />
					</div>
					<span className={cn('h-2.5 w-48', SKELETON_BAR)} />
				</div>
				<div className="flex items-center gap-2">
					<ToolbarPills widths={HEADER_ACTION_WIDTHS} />
				</div>
			</div>
		</div>
	);
}

export function InvoiceDetailBodySkeleton() {
	return (
		<div
			aria-hidden="true"
			className="mx-auto flex w-full max-w-3xl flex-col gap-7 rounded-xl bg-card px-5 pt-7 pb-6 hairline-ring ring-border shadow-sm shadow-black/6.5 sm:px-8 sm:pt-9 sm:pb-8"
		>
			<div className="flex justify-between gap-4">
				<span className={cn('h-4 w-32', SKELETON_BAR)} />
				<div className="flex flex-col items-end gap-2">
					<span className={cn('h-5 w-36', SKELETON_BAR)} />
					<span className={cn('h-3 w-28', SKELETON_BAR)} />
				</div>
			</div>
			<div className="grid gap-5 sm:grid-cols-2">
				<span className={cn('h-10 w-40', SKELETON_BAR)} />
				<span className={cn('h-10 w-40', SKELETON_BAR)} />
			</div>
			<div className="flex flex-col gap-4">
				{LINE_KEYS.map((key) => (
					<div key={key} className="flex items-center justify-between gap-4">
						<span className={cn('h-3 w-56', SKELETON_BAR)} />
						<span className={cn('h-3 w-20', SKELETON_BAR)} />
					</div>
				))}
			</div>
			<div className="ml-auto flex w-full max-w-xs flex-col gap-2">
				{TOTAL_KEYS.map((key) => (
					<span key={key} className={cn('h-3 w-full', SKELETON_BAR)} />
				))}
			</div>
		</div>
	);
}

export function InvoiceDetailPageSkeleton() {
	return (
		<PageSkeletonFrame toolbar={<InvoiceDetailHeaderSkeleton />}>
			<InvoiceDetailBodySkeleton />
		</PageSkeletonFrame>
	);
}
