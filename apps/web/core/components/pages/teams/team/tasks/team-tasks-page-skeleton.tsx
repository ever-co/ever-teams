'use client';

import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

const GROUP_COUNT = 2;
const ROWS_PER_GROUP = 6;

/** Titles of varying length, so the skeleton reads as a list of tasks and not as a grid of equal bars. */
const TITLE_WIDTHS = ['w-[62%]', 'w-[48%]', 'w-[70%]', 'w-[38%]', 'w-[56%]', 'w-[44%]'];

/** The toolbar band of the page: title, meta and New task; then the scope switch, search, Filter and Display. */
export function TeamTasksToolbarSkeleton() {
	const t = useTranslations();
	return (
		<ToolbarBandSkeleton
			title={t('sidebar.TEAMTASKS')}
			actionWidths={['w-24']}
			controlWidths={['w-56']}
			trailingWidths={['w-56', 'w-20', 'w-24']}
		/>
	);
}

function RowSkeleton({ titleWidth }: Readonly<{ titleWidth: string }>) {
	return (
		<div className="flex h-10 items-center gap-3 hairline-b border-border px-3 lg:pl-9">
			<span className={cn(BAR, 'size-4 shrink-0 max-lg:hidden')} />
			<span className={cn(BAR, 'h-2.5 w-9 shrink-0 max-lg:hidden')} />
			<span className={cn(BAR, 'size-4 shrink-0')} />
			<span className="flex min-w-0 flex-1 items-center gap-2">
				<span className={cn(BAR, 'size-4 shrink-0 rounded-[5px]')} />
				<span className={cn(BAR, 'h-2.5', titleWidth)} />
			</span>
			<span className={cn(BAR, 'h-4 w-16 shrink-0 rounded-[5px] max-lg:hidden')} />
			<span className={cn(BAR, 'h-2.5 w-20 shrink-0 max-lg:hidden')} />
			<span className={cn(BAR, 'h-2.5 w-14 shrink-0 max-lg:hidden')} />
			<span className={cn(BAR, 'size-5 shrink-0')} />
		</div>
	);
}

function GroupSkeleton({ offset }: Readonly<{ offset: number }>) {
	const rows = Array.from({ length: ROWS_PER_GROUP }, (_, index) => index);
	return (
		<>
			<div className="flex h-9 items-center gap-2 hairline-b border-border bg-foreground/[0.025] px-3 lg:pl-9">
				<span className={cn(BAR, 'size-4')} />
				<span className={cn(BAR, 'h-2.5 w-24')} />
				<span className={cn(BAR, 'h-[18px] w-[18px] rounded-[5px]')} />
			</div>
			{rows.map((index) => {
				const widthIndex = (index + offset) % TITLE_WIDTHS.length;
				const width = TITLE_WIDTHS[widthIndex];
				return <RowSkeleton key={index} titleWidth={width} />;
			})}
		</>
	);
}

/** The list while the team's tasks load: the column labels' band, then two groups of rows of the loaded height. */
export function TeamTasksListSkeleton() {
	const groups = Array.from({ length: GROUP_COUNT }, (_, index) => index);
	return (
		<div className="h-full overflow-hidden" aria-hidden="true">
			<div className="h-9 hairline-b border-border max-lg:hidden" />
			{groups.map((index) => (
				<GroupSkeleton key={index} offset={index * 2} />
			))}
		</div>
	);
}

interface TeamTasksPageSkeletonProps {
	className?: string;
}

/** The team tasks page while it loads, shown by its route, by the authentication wait and by its own first load. */
export const TeamTasksPageSkeleton: FC<TeamTasksPageSkeletonProps> = ({ className }) => {
	return (
		<PageSkeletonFrame className={cn('min-h-0 flex-1 p-0', className)} toolbar={<TeamTasksToolbarSkeleton />}>
			<div className="absolute inset-0">
				<TeamTasksListSkeleton />
			</div>
		</PageSkeletonFrame>
	);
};

export default TeamTasksPageSkeleton;
