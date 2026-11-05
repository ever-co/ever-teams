import { cn } from '@/core/lib/helpers';
import { TASK_ROW_SKELETON_BAR } from '@/core/components/tasks/task-row-recipes';
import { VISITED_ROW_GRID, VISITED_ROW_METER } from './visited-Item';

/** One row of the apps and visited sites lists while they load, on the row's own grid. */
export function VisitedItemSkeleton() {
	return (
		<div className="@container" aria-hidden="true">
			<div className={VISITED_ROW_GRID}>
				<span className={cn('h-2.5 w-7', TASK_ROW_SKELETON_BAR)} />
				<span className="flex min-w-0 flex-col gap-2 py-0.5">
					<span className={cn('h-2.5 w-2/3', TASK_ROW_SKELETON_BAR)} />
					<span className={cn('h-2 w-1/3', TASK_ROW_SKELETON_BAR)} />
				</span>
				<span className={cn('h-1 w-full', TASK_ROW_SKELETON_BAR, VISITED_ROW_METER)} />
				<span className={cn('ml-auto h-2.5 w-12', TASK_ROW_SKELETON_BAR)} />
			</div>
		</div>
	);
}
