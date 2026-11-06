import { cn } from '@/core/lib/helpers';
import { KanbanCardSkeleton } from './kanban-card-skeleton';

interface KanbanColumnLoadingSkeletonProps {
	className?: string;
}

/** The cards of a lane while its tasks load; the lane keeps its own header and its add-task row. */
export function KanbanColumnLoadingSkeleton({ className }: KanbanColumnLoadingSkeletonProps) {
	return (
		<div className={cn('flex w-full flex-col', className)}>
			<KanbanCardSkeleton />
			<KanbanCardSkeleton />
		</div>
	);
}
