import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Card } from '@/core/components/common/card';
import {
	ActivityTableSkeleton,
	CardTimeAndActivitySkeleton,
	TimeActivityHeaderSkeleton
} from './time-activity-skeletons';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

interface TimeActivityPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

/** Time and activity: breadcrumb in the top bar, the title row in the band, the statistics strip, then the table surface. */
export const TimeActivityPageSkeleton: FC<TimeActivityPageSkeletonProps> = ({ className, showTimer = false }) => {
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
				<div className="px-4 py-3">
					<TimeActivityHeaderSkeleton />
				</div>
			}
		>
			<div className="flex w-full flex-col gap-4">
				<Card className="grid w-full grid-cols-1 hairline-divide-y divide-dashed divide-border overflow-hidden sm:grid-cols-3 sm:hairline-divide-x sm:divide-y-0">
					<CardTimeAndActivitySkeleton />
					<CardTimeAndActivitySkeleton showProgress />
					<CardTimeAndActivitySkeleton />
				</Card>
				<Card className="min-h-[600px] w-full overflow-hidden">
					<ActivityTableSkeleton />
				</Card>
			</div>
		</PageLayout>
	);
};

export default TimeActivityPageSkeleton;
