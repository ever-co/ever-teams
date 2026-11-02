'use client';

import { IssuesView } from '@/core/constants/config/constants';
import { useAtomValue } from 'jotai';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { cn } from '@/core/lib/helpers';
import { MEMBER_CARD_PADDING, MEMBER_GRID_FROM, MEMBER_ROW_GRID } from '@/core/components/teams/member-row-grid';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const BLOCK_FILTER_LABEL_WIDTHS = ['w-24', 'w-24', 'w-16', 'w-16', 'w-14'];

interface TeamMemberHeaderSkeletonProps {
	view?: IssuesView;
	className?: string;
}

/** The column labels over the members list, in the geometry of each view. */
export function TeamMemberHeaderSkeleton({
	view = IssuesView.CARDS,
	className
}: Readonly<TeamMemberHeaderSkeletonProps>) {
	const renderCardHeaderSkeleton = () => (
		<div className={cn(MEMBER_GRID_FROM, 'w-full px-4', className)}>
			<div className={cn(MEMBER_ROW_GRID, MEMBER_CARD_PADDING, 'h-9 items-center')}>
				<div className="pr-4">
					<div className={cn(BAR, 'h-3 w-28')} />
				</div>
				<div className="px-4">
					<div className={cn(BAR, 'h-3 w-12')} />
				</div>
				<div className="flex justify-center px-4">
					<div className={cn(BAR, 'h-3 w-20')} />
				</div>
				<div className="flex justify-center px-4">
					<div className={cn(BAR, 'h-3 w-16')} />
				</div>
				<div className="flex justify-center px-4">
					<div className={cn(BAR, 'h-3 w-24')} />
				</div>
				<span aria-hidden="true" />
			</div>
		</div>
	);

	const renderBlockHeaderSkeleton = () => (
		<div className={cn('hidden items-end justify-between gap-3 px-4 sm:flex', className)}>
			<div className="flex min-w-0 items-end gap-6">
				{BLOCK_FILTER_LABEL_WIDTHS.map((width, index) => (
					<div key={index} className="flex items-center gap-1.5 pb-3 pt-2">
						<div className={cn(BAR, 'size-4 rounded-sm')} />
						<div className={cn(BAR, 'h-4', width)} />
						<div className={cn(BAR, 'h-5 w-6')} />
					</div>
				))}
			</div>
			<div className="flex shrink-0 items-center gap-3 pb-2">
				<div className={cn(BAR, 'size-8')} />
				<div className="h-4 w-px bg-border" />
				<div className={cn(BAR, 'h-8 w-16')} />
			</div>
		</div>
	);

	const renderMap = {
		[IssuesView.TABLE]: renderCardHeaderSkeleton,
		[IssuesView.BLOCKS]: renderBlockHeaderSkeleton,
		[IssuesView.CARDS]: renderCardHeaderSkeleton
	};

	const renderHeaderSkeleton = renderMap[view as keyof typeof renderMap] || renderCardHeaderSkeleton;

	return renderHeaderSkeleton();
}

/** The header skeleton of the view the user picked, for loaders that receive no props (lazy chunks). */
export function CurrentViewHeaderSkeleton() {
	const view = useAtomValue(headerTabs);
	return <TeamMemberHeaderSkeleton view={view} />;
}
