import { cn } from '@/core/lib/helpers';
import { LANE_SURFACE, LANE_WIDTH } from '@/core/components/tasks/kanban-lane-recipes';
import { KanbanColumnLoadingSkeleton } from './kanban-column-loading-skeleton';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const LANE_COUNT = 5;

interface KanbanViewSkeletonProps {
	className?: string;
}

function KanbanLaneSkeleton() {
	return (
		<div className={cn('flex h-[840px] flex-col rounded-xl p-2', LANE_WIDTH, LANE_SURFACE)}>
			<div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
				<div className="flex min-w-0 items-center gap-2">
					<div className={cn(BAR, 'size-6 shrink-0')} />
					<div className={cn(BAR, 'h-4 w-24')} />
					<div className={cn(BAR, 'h-5 w-7')} />
				</div>
				<div className="flex items-center gap-0.5">
					<div className={cn(BAR, 'size-7')} />
					<div className={cn(BAR, 'size-7')} />
				</div>
			</div>
			<div className="flex flex-col pt-2">
				<KanbanColumnLoadingSkeleton />
				<div className={cn(BAR, 'h-9 w-full rounded-lg')} />
			</div>
		</div>
	);
}

/** The board: five lanes on the card tone, each with its header, two cards and the add-task row. */
export function KanbanViewSkeleton({ className }: Readonly<KanbanViewSkeletonProps>) {
	const laneKeys = Array.from({ length: LANE_COUNT }, (_, index) => index);
	return (
		<div className={cn('relative w-full overflow-x-auto', className)}>
			<div className="flex w-max flex-row gap-4 pb-3">
				{laneKeys.map((key) => (
					<KanbanLaneSkeleton key={key} />
				))}
			</div>
		</div>
	);
}
