import { TASK_GROUP_STACK, TASK_ROW_SKELETON_BAR } from '@/core/components/tasks/task-row-recipes';
import { cn } from '@/core/lib/helpers';

const SKELETON_TILES = [0, 1, 2, 3];

/** One hour of slots while the day loads: the hour label, then tiles on the slot geometry (frame, range, actions). */
export const ScreenshootSkeleton = () => {
	return (
		<div className={TASK_GROUP_STACK} aria-hidden="true">
			<div className="flex min-h-8 items-center">
				<span className={cn('h-2.5 w-24', TASK_ROW_SKELETON_BAR)} />
			</div>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-3 gap-y-5">
				{SKELETON_TILES.map((tile) => (
					<div key={tile} className="flex flex-col gap-1.5">
						<span className="block aspect-[16/10] w-full animate-pulse rounded-md bg-foreground/[0.04]" />
						<div className="flex min-h-5 items-center justify-between gap-2">
							<span className={cn('h-2.5 w-20', TASK_ROW_SKELETON_BAR)} />
							<span className={cn('h-2.5 w-14', TASK_ROW_SKELETON_BAR)} />
						</div>
						<div className="flex h-7 items-center gap-3">
							<span className={cn('h-2.5 w-14', TASK_ROW_SKELETON_BAR)} />
							<span className={cn('h-2.5 w-10', TASK_ROW_SKELETON_BAR)} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
