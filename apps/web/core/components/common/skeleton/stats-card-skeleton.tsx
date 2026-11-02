import { Card } from '@/core/components/common/card';
import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

/** A TeamStatsGrid cell draws its own left and top hairlines; the card clips the outer ones (`overflow-hidden`). */
export const STAT_CELL_CLASS_NAME =
	'-ml-px -mt-px flex min-w-0 flex-col gap-2 hairline-l hairline-t border-dashed border-border px-4 py-3.5';

const STAT_CELLS = [
	{ key: 'members', showProgress: false },
	{ key: 'projects', showProgress: false },
	{ key: 'today', showProgress: true },
	{ key: 'week', showProgress: true }
];

interface StatsCardSkeletonProps {
	className?: string;
}

function StatCellSkeleton({ showProgress }: { showProgress: boolean }) {
	return (
		<div className={STAT_CELL_CLASS_NAME}>
			<div className="flex h-4 items-center">
				<div className={cn(BAR, 'h-3 w-24')} />
			</div>
			<div className="flex h-6 items-center">
				<div className={cn(BAR, 'h-5 w-20')} />
			</div>
			{showProgress && <div className={cn(BAR, 'h-1 w-full rounded-full')} />}
		</div>
	);
}

/** The four cells of TeamStatsGrid on one surface, split by dashed hairlines. */
export function StatsCardSkeleton({ className }: StatsCardSkeletonProps) {
	return (
		<Card className={cn('grid grid-cols-1 overflow-hidden sm:grid-cols-2 xl:grid-cols-4', className)}>
			{STAT_CELLS.map((cell) => (
				<StatCellSkeleton key={cell.key} showProgress={cell.showProgress} />
			))}
		</Card>
	);
}
