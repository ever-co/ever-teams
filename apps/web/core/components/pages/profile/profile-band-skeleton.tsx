import { cn } from '@/core/lib/helpers';
import { BRAND_WASH_PANEL } from '@/core/components/common/surface-recipes';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

const FIGURE_COUNT = 4;

const TAB_COUNT = 5;

const FIGURE_KEYS = Array.from({ length: FIGURE_COUNT }, (_, index) => `figure-${index}`);

const TAB_KEYS = Array.from({ length: TAB_COUNT }, (_, index) => `tab-${index}`);

/** The identity band while it loads: the identity line, then the summary card with its "Now" inset and figures. */
export function ProfileBandSkeleton({ showsTimer = false }: Readonly<{ showsTimer?: boolean }>) {
	return (
		<div className="flex flex-col gap-4 pb-5 pt-4" aria-hidden="true">
			<div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
				<div className="flex min-w-0 items-center gap-3.5">
					<span className="size-12 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<div className="flex flex-col gap-2">
						<span className={cn(BAR, 'h-5 w-44')} />
						<span className={cn(BAR, 'h-3.5 w-56 max-sm:w-44')} />
					</div>
				</div>
				<div className="flex items-center gap-2 max-md:w-full">
					<span className={cn(BAR, 'h-9 w-28 max-md:flex-1')} />
					<span className={cn(BAR, 'h-9 w-32 max-md:flex-1')} />
				</div>
			</div>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="grid grid-cols-2 rounded-2xl bg-card p-1.5 max-sm:w-full sm:flex sm:w-fit">
					{FIGURE_KEYS.map((key) => (
						<div key={key} className="flex min-w-36 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
							<span className={cn(BAR, 'h-3 w-14')} />
							<span className={cn(BAR, 'h-4 w-16')} />
						</div>
					))}
				</div>
				{showsTimer && (
					<div
						className={cn(
							BRAND_WASH_PANEL,
							'flex w-full max-w-xs flex-col justify-center gap-3 px-4 py-3.5 max-xl:order-first max-sm:max-w-none'
						)}
					>
						<span className={cn(BAR, 'h-3.5 w-56')} />
						<span className={cn(BAR, 'h-8 w-52')} />
					</div>
				)}
			</div>
		</div>
	);
}

/** The tab row and its controls while they load. */
export function ProfileTabsSkeleton() {
	return (
		<div className="flex w-full flex-wrap items-end justify-between gap-x-4 gap-y-2" aria-hidden="true">
			<div className="flex items-center gap-5 pb-3 pt-2 max-md:order-last">
				{TAB_KEYS.map((key) => (
					<span key={key} className={cn(BAR, 'h-3.5 w-20')} />
				))}
			</div>
			<div className="flex items-center gap-2 pb-2 max-md:w-full">
				<span className="h-8 w-56 animate-pulse rounded-lg bg-foreground/[0.04] max-md:flex-1" />
				<span className="h-8 w-20 animate-pulse rounded-lg bg-foreground/[0.04]" />
			</div>
		</div>
	);
}
