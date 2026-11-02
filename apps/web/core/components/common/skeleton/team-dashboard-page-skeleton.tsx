import { FC } from 'react';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';
import { StatsCardSkeleton } from './stats-card-skeleton';
import { TeamStatsTableSkeleton } from './team-stats-table-skeleton';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

interface TeamDashboardPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

/** The team dashboard: breadcrumb in the top bar, the title row in the band, then the strip, the chart toggle and the table. */
export const TeamDashboardPageSkeleton: FC<TeamDashboardPageSkeletonProps> = ({ className, showTimer = false }) => {
	return (
		<PageLayout
			showTimer={showTimer}
			className={className}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<div className={cn(BAR, 'size-7 shrink-0')} />
					<div className={cn(BAR, 'size-4 shrink-0 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-16')} />
					<div className={cn(BAR, 'size-3.5 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-32')} />
				</div>
			}
			mainHeaderSlot={
				<div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div className={cn(BAR, 'h-5 w-40')} />
					<div className="flex flex-wrap items-center gap-2">
						<div className={cn(BAR, 'h-8 w-56')} />
						<div className={cn(BAR, 'h-8 w-24')} />
						<div className={cn(BAR, 'h-8 w-24')} />
					</div>
				</div>
			}
		>
			<div className="flex w-full flex-col gap-4">
				<StatsCardSkeleton />
				<div className="flex justify-center">
					<div className={cn(BAR, 'h-8 w-44')} />
				</div>
				<TeamStatsTableSkeleton />
			</div>
		</PageLayout>
	);
};

export default TeamDashboardPageSkeleton;
