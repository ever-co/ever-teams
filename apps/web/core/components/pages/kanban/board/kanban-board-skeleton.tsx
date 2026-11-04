import { cn } from '@/core/lib/helpers';
import { LANE_SURFACE, LANE_WIDTH } from './kanban-recipes';

const BAR = 'block animate-pulse rounded-full bg-foreground/[0.06]';

const LANE_CARD_COUNTS = [3, 2, 4, 1];

const CARD_KEYS = ['card-1', 'card-2', 'card-3', 'card-4'];

function CardSkeleton() {
	return (
		<div className="flex flex-col gap-2.5 rounded-xl bg-card p-3 hairline-ring ring-border">
			<div className="flex gap-1">
				<span className={cn(BAR, 'h-5 w-14 rounded-[5px]')} />
				<span className={cn(BAR, 'h-5 w-12 rounded-[5px]')} />
			</div>
			<span className={cn(BAR, 'h-3.5 w-11/12')} />
			<span className={cn(BAR, 'h-3.5 w-2/3')} />
			<div className="flex items-center justify-between hairline-t border-border pt-2.5">
				<span className={cn(BAR, 'size-6')} />
				<span className={cn(BAR, 'h-3 w-20')} />
			</div>
		</div>
	);
}

/** The board while the statuses load: lanes and cards at their real size, so nothing moves when data arrives. */
export function KanbanBoardSkeleton() {
	return (
		<output className="flex h-full gap-3 overflow-hidden px-4 py-3">
			{LANE_CARD_COUNTS.map((cardCount, laneIndex) => (
				<div
					key={laneIndex}
					className={cn('flex h-full shrink-0 flex-col rounded-xl', LANE_WIDTH, LANE_SURFACE)}
				>
					<div className="flex h-11 items-center gap-2 px-3">
						<span className={cn(BAR, 'size-5 rounded-md')} />
						<span className={cn(BAR, 'h-3 w-24')} />
						<span className={cn(BAR, 'h-4 w-6 rounded-md')} />
					</div>
					<div className="flex flex-col gap-2 px-2">
						{CARD_KEYS.slice(0, cardCount).map((key) => (
							<CardSkeleton key={key} />
						))}
					</div>
				</div>
			))}
		</output>
	);
}
