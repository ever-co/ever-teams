import { FC } from 'react';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';
import {
	DatePickerWithRangeSkeleton,
	GroupBySelectSkeleton,
	MembersSelectSkeleton,
	ReportsContentSkeleton,
	WeeklyLimitExportMenuSkeleton
} from './reports-component-skeletons';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

interface ReportsPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

/** The weekly limit report: breadcrumb in the top bar, the title row with its controls in the band, the tables in the body. */
export const ReportsPageSkeleton: FC<ReportsPageSkeletonProps> = ({ className, showTimer = false }) => {
	return (
		<PageLayout
			showTimer={showTimer}
			className={className}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<div className={cn(BAR, 'size-4 shrink-0 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-16')} />
					<div className={cn(BAR, 'size-3.5 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-28')} />
				</div>
			}
			mainHeaderSlot={
				<div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div className={cn(BAR, 'h-5 w-32')} />
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex items-center gap-2">
							<div className={cn(BAR, 'h-4 w-16')} />
							<GroupBySelectSkeleton />
						</div>
						<MembersSelectSkeleton />
						<DatePickerWithRangeSkeleton />
						<WeeklyLimitExportMenuSkeleton />
					</div>
				</div>
			}
		>
			<ReportsContentSkeleton />
		</PageLayout>
	);
};

export default ReportsPageSkeleton;
