'use client';

import { IssuesView } from '@/core/constants/config/constants';
import { useAtomValue } from 'jotai';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { MemberListSkeleton } from '@/core/components/teams/member-row-skeleton';
import { MEMBER_LIST_CONTAINER } from '@/core/components/teams/member-row-grid';
import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const BLOCK_SURFACE =
	'flex flex-col overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

const MEMBER_BLOCKS = 6;

interface TeamMembersSkeletonProps {
	view?: IssuesView;
	className?: string;
}

function MemberIdentitySkeleton() {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<div className={cn(BAR, 'size-9 shrink-0 rounded-full')} />
			<div className="flex min-w-0 flex-col gap-1.5">
				<div className={cn(BAR, 'h-4 w-32')} />
				<div className={cn(BAR, 'h-3 w-40')} />
			</div>
		</div>
	);
}

export function MemberBlockSkeleton() {
	return (
		<div className={BLOCK_SURFACE}>
			<div className="flex items-center justify-between gap-3 px-4 py-3">
				<MemberIdentitySkeleton />
				<div className="flex shrink-0 items-center gap-2">
					<div className={cn(BAR, 'h-6 w-16')} />
					<div className={cn(BAR, 'size-8')} />
				</div>
			</div>
			<div className="flex w-full flex-col gap-1.5 hairline-t border-dashed border-border px-4 py-3">
				<div className={cn(BAR, 'h-4 w-full')} />
				<div className={cn(BAR, 'h-3 w-2/3')} />
			</div>
			<div className="grid grid-cols-3 hairline-divide-x divide-dashed divide-border hairline-t border-dashed border-border">
				<div className="flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-3">
					<div className={cn(BAR, 'h-3 w-16')} />
					<div className={cn(BAR, 'h-4 w-14')} />
				</div>
				<div className="flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-3">
					<div className={cn(BAR, 'h-3 w-16')} />
					<div className={cn(BAR, 'h-4 w-14')} />
				</div>
				<div className="flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-3">
					<div className={cn(BAR, 'h-3 w-16')} />
					<div className={cn(BAR, 'h-4 w-14')} />
				</div>
			</div>
		</div>
	);
}

/** The members list of the team page in its three views: rows on the shared grid, the table, or the blocks. */
const TeamMembersSkeleton = ({ view = IssuesView.CARDS, className }: TeamMembersSkeletonProps) => {
	const blockKeys = Array.from({ length: MEMBER_BLOCKS }, (_, index) => index);

	const renderCardView = () => <MemberListSkeleton view={IssuesView.CARDS} className={className} />;

	const renderTableView = () => <MemberListSkeleton view={IssuesView.TABLE} className={className} />;

	const renderBlockView = () => (
		<div className={cn(MEMBER_LIST_CONTAINER, className)}>
			<div className="grid w-full gap-3 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
				{blockKeys.map((key) => (
					<MemberBlockSkeleton key={key} />
				))}
			</div>
		</div>
	);

	const renderMap = {
		[IssuesView.TABLE]: renderTableView,
		[IssuesView.BLOCKS]: renderBlockView,
		[IssuesView.CARDS]: renderCardView
	};

	const renderContent = renderMap[view as keyof typeof renderMap] || renderCardView;

	return renderContent();
};

export default TeamMembersSkeleton;

/** The list skeleton of the view the user picked, for loaders that receive no props (lazy chunks). */
export function CurrentViewMembersSkeleton() {
	const view = useAtomValue(headerTabs);
	return <TeamMembersSkeleton view={view} />;
}
