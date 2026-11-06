import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const FILTER_CONTROL = 'flex h-8 min-w-fit items-center justify-center rounded-md bg-card px-2.5 input-border';

const FILTER_LABEL_WIDTHS = ['w-24', 'w-20', 'w-20', 'w-24', 'w-20'];

interface KanbanFiltersSkeletonProps {
	className?: string;
}

/** The filter controls of the kanban band: five dropdown controls, a hairline, then the search field. */
export function KanbanFiltersSkeleton({ className }: KanbanFiltersSkeletonProps) {
	return (
		<div className={cn('flex flex-wrap items-center gap-2', className)}>
			{FILTER_LABEL_WIDTHS.map((width, index) => (
				<div key={index} className={FILTER_CONTROL}>
					<div className={cn(BAR, 'h-4', width)} />
				</div>
			))}
			<div className="mx-1 h-4 w-px shrink-0 bg-border" />
			<div className={cn(BAR, 'h-8 w-44')} />
		</div>
	);
}
