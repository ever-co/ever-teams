import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';

const HEADER_ACTION_WIDTHS = ['w-16', 'w-28', 'w-8'];

const FIGURE_KEYS = ['owed', 'overdue', 'billed', 'last'];

const ROW_KEYS = ['first', 'second', 'third'];

const FACT_KEYS = ['email', 'phone', 'terms', 'added'];

const SURFACE = 'rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

export function ClientDetailHeaderSkeleton() {
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<span className="size-10 shrink-0 animate-pulse rounded-[11px] bg-foreground/[0.06]" />
					<div className="flex flex-col gap-2">
						<span className={cn('h-5 w-48', SKELETON_BAR)} />
						<span className={cn('h-2.5 w-56', SKELETON_BAR)} />
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ToolbarPills widths={HEADER_ACTION_WIDTHS} />
				</div>
			</div>
		</div>
	);
}

export function ClientDetailBodySkeleton() {
	return (
		<div
			aria-hidden="true"
			className="mx-auto grid w-full max-w-6xl gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-10"
		>
			<div className="flex min-w-0 flex-col gap-6">
				<div className={cn('grid grid-cols-2 gap-4 p-4 sm:grid-cols-4', SURFACE)}>
					{FIGURE_KEYS.map((key) => (
						<div key={key} className="flex flex-col gap-2">
							<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
							<span className={cn('h-4 w-20', SKELETON_BAR)} />
						</div>
					))}
				</div>
				<div className={cn('flex flex-col gap-4 p-4', SURFACE)}>
					<span className={cn('h-3 w-20', SKELETON_BAR)} />
					{ROW_KEYS.map((key) => (
						<div key={key} className="flex items-center justify-between gap-4">
							<span className={cn('h-3 w-40', SKELETON_BAR)} />
							<span className={cn('h-3 w-16', SKELETON_BAR)} />
						</div>
					))}
				</div>
			</div>
			<div className={cn('flex flex-col gap-3 self-start p-4', SURFACE)}>
				<span className={cn('h-3 w-16', SKELETON_BAR)} />
				{FACT_KEYS.map((key) => (
					<div key={key} className="flex items-center justify-between">
						<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
						<span className={cn('h-3 w-24', SKELETON_BAR)} />
					</div>
				))}
			</div>
		</div>
	);
}

export function ClientDetailPageSkeleton() {
	return (
		<PageSkeletonFrame toolbar={<ClientDetailHeaderSkeleton />}>
			<ClientDetailBodySkeleton />
		</PageSkeletonFrame>
	);
}
