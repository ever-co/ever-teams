import { FC } from 'react';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';
import { KanbanFiltersSkeleton } from '../../common/skeleton/kanban-filters-skeleton';
import { KanbanViewSkeleton } from '../../common/skeleton/kanban-view-skeleton';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const TEAM_AVATARS = 4;

const DATE_TAB_WIDTHS = ['w-12', 'w-14', 'w-20', 'w-20'];

interface KanbanPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

/** The kanban page: breadcrumb in the top bar, the title row and the tabs with filters in the band, the lanes in the body. */
export const KanbanPageSkeleton: FC<KanbanPageSkeletonProps> = ({ className, showTimer = false }) => {
	const avatarKeys = Array.from({ length: TEAM_AVATARS }, (_, index) => index);
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
					<div className={cn(BAR, 'h-4 w-16')} />
				</div>
			}
			mainHeaderSlot={
				<div className="px-4">
					<div className="flex flex-wrap items-center justify-between gap-3 py-3">
						<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
							<div className={cn(BAR, 'h-5 w-36')} />
							<div className={cn(BAR, 'h-4 w-24')} />
						</div>
						<div className="flex min-w-fit flex-wrap items-center gap-x-2">
							<div className={cn(BAR, 'h-8 w-30.5')} />
							<div className="h-4 w-px shrink-0 bg-border" />
							<div className="flex -space-x-2">
								{avatarKeys.map((key) => (
									<div key={key} className={cn(BAR, 'size-8 rounded-full ring-2 ring-card')} />
								))}
							</div>
							<div className="h-4 w-px shrink-0 bg-border" />
							<div className={cn(BAR, 'size-8')} />
						</div>
					</div>
					<div className="flex flex-col items-start justify-between gap-3 pb-3 xl:flex-row xl:items-end">
						<div className="flex w-full items-end gap-6 hairline-b border-border xl:w-auto">
							{DATE_TAB_WIDTHS.map((width, index) => (
								<div key={index} className="pb-3 pt-2">
									<div className={cn(BAR, 'h-5', width)} />
								</div>
							))}
						</div>
						<KanbanFiltersSkeleton className="w-full xl:w-auto" />
					</div>
				</div>
			}
		>
			<div className="w-full">
				<KanbanViewSkeleton />
			</div>
		</PageLayout>
	);
};

export default KanbanPageSkeleton;
