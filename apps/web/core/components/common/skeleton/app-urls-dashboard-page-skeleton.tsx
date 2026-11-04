import { FC } from 'react';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Card } from '@/core/components/common/card';
import { cn } from '@/core/lib/helpers';
import { ProductivityHeaderSkeleton } from './productivity-header-skeleton';
import { ProductivityTableSkeleton } from './productivity-table-skeleton';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

interface AppUrlsDashboardPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

/** Apps and URLs: breadcrumb in the top bar, the title row in the band, the productivity surface, then the date table. */
export const AppUrlsDashboardPageSkeleton: FC<AppUrlsDashboardPageSkeletonProps> = ({
	className,
	showTimer = false
}) => {
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
					<div className={cn(BAR, 'h-4 w-24')} />
				</div>
			}
			mainHeaderSlot={
				<div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3">
					<div className={cn(BAR, 'h-5 w-48')} />
					<div className="flex flex-wrap items-center gap-2">
						<div className={cn(BAR, 'h-8 w-32')} />
						<div className={cn(BAR, 'h-8 w-56')} />
						<div className={cn(BAR, 'h-8 w-24')} />
						<div className={cn(BAR, 'h-8 w-24')} />
					</div>
				</div>
			}
		>
			<div className="flex w-full flex-col gap-4">
				<Card className="w-full overflow-hidden">
					<div className="hairline-b border-border px-4 py-3">
						<ProductivityHeaderSkeleton />
					</div>
					<div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
						<div className={cn(BAR, 'size-10 rounded-lg')} />
						<div className={cn(BAR, 'h-4 w-full max-w-md')} />
					</div>
				</Card>
				<ProductivityTableSkeleton />
			</div>
		</PageLayout>
	);
};

export default AppUrlsDashboardPageSkeleton;
