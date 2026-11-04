import { FC } from 'react';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Card } from '@/core/components/common/card';
import { cn } from '@/core/lib/helpers';
import {
	TimesheetCardSkeleton,
	TimesheetFilterSkeleton,
	TimesheetPaginationSkeleton,
	TimesheetViewSkeleton
} from './timesheet-skeletons';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

interface TimesheetPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

/** The timesheet page: breadcrumb in the top bar, the filter rows and the view tabs in the band, the strip and the list below. */
export const TimesheetPageSkeleton: FC<TimesheetPageSkeletonProps> = ({ className, showTimer = false }) => {
	return (
		<PageLayout
			showTimer={showTimer}
			className={className}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<div className={cn(BAR, 'size-4 shrink-0 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-16')} />
					<div className={cn(BAR, 'size-3.5 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-20')} />
					<div className={cn(BAR, 'size-3.5 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-24')} />
				</div>
			}
			mainHeaderSlot={
				<div className="px-4">
					<TimesheetFilterSkeleton />
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-end gap-6">
							<div className="pb-3 pt-2">
								<div className={cn(BAR, 'h-5 w-24')} />
							</div>
							<div className="pb-3 pt-2">
								<div className={cn(BAR, 'h-5 w-28')} />
							</div>
						</div>
						<div className={cn(BAR, 'mb-2 h-8 w-full sm:w-80 lg:w-96')} />
					</div>
				</div>
			}
		>
			<div className="flex w-full flex-col gap-4">
				<Card className="flex flex-col hairline-divide-y divide-dashed divide-border overflow-hidden md:flex-row md:hairline-divide-x md:divide-y-0">
					<div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
						<div className={cn(BAR, 'h-5 w-56')} />
						<div className={cn(BAR, 'h-3 w-72')} />
					</div>
					<TimesheetCardSkeleton />
					<TimesheetCardSkeleton />
				</Card>
				<Card className="overflow-x-auto">
					<TimesheetViewSkeleton />
					<TimesheetPaginationSkeleton />
				</Card>
			</div>
		</PageLayout>
	);
};

export default TimesheetPageSkeleton;
