import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';

const FIGURE_KEYS = ['owed', 'overdue', 'billed', 'last'];

const FACT_KEYS = ['email', 'phone', 'terms'];

export function ClientSheetBodySkeleton() {
	return (
		<div aria-hidden="true" className="flex min-h-0 flex-1 flex-col gap-6 px-5 pt-2 pb-8">
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<span className="size-10 shrink-0 animate-pulse rounded-[11px] bg-foreground/[0.06]" />
					<div className="flex flex-col gap-2">
						<span className={cn('h-4 w-44', SKELETON_BAR)} />
						<span className={cn('h-2.5 w-56', SKELETON_BAR)} />
					</div>
				</div>
				<div className="flex gap-2">
					<span className="h-8 w-20 animate-pulse rounded-full bg-foreground/[0.05]" />
					<span className="h-8 w-28 animate-pulse rounded-full bg-foreground/[0.05]" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4 rounded-xl p-4 hairline-ring ring-border sm:grid-cols-4">
				{FIGURE_KEYS.map((key) => (
					<div key={key} className="flex flex-col gap-2">
						<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
						<span className={cn('h-4 w-20', SKELETON_BAR)} />
					</div>
				))}
			</div>
			<div className="flex flex-col gap-3">
				<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
				{FACT_KEYS.map((key) => (
					<span key={key} className={cn('h-3 w-48', SKELETON_BAR)} />
				))}
			</div>
		</div>
	);
}
