'use client';

import { FC } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { ViewSwitchSkeleton, MemberRowSkeleton } from '@/core/components/teams/member-row-skeleton';
import { TeamMemberHeaderSkeleton } from '@/core/components/common/skeleton/team-member-header-skeleton';
import { MemberBlockSkeleton } from '@/core/components/common/skeleton/team-members-skeleton';
import { IssuesView } from '@/core/constants/config/constants';
import { allTeamsHeaderTabs } from '@/core/stores/common/header-tabs';
import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/[0.06]';

/** Teams and combined members. */
const ALL_TEAMS_VIEW_COUNT = 2;

const TEAM_GROUP_KEYS = ['team-1', 'team-2'];

const MEMBER_ROW_KEYS = ['member-1', 'member-2', 'member-3'];

const MEMBER_BLOCK_KEYS = ['block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-6'];

const TEAM_LIST_SURFACE =
	'w-full hairline-divide-y divide-border overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

interface AllTeamsPageSkeletonProps {
	className?: string;
}

function AllTeamsToolbarSkeleton({ isCardsView }: Readonly<{ isCardsView: boolean }>) {
	const t = useTranslations();
	return (
		<div aria-hidden="true">
			<div className="px-4">
				<div className="flex flex-wrap items-center justify-between gap-3 py-3">
					<h1 className="text-lg font-semibold">{t('common.ALL_TEAMS')}</h1>
					<div className="flex items-center gap-2">
						<ViewSwitchSkeleton iconCount={ALL_TEAMS_VIEW_COUNT} />
						<ToolbarPills widths={['w-42.5']} />
					</div>
				</div>
			</div>
			{isCardsView && <TeamMemberHeaderSkeleton view={IssuesView.CARDS} />}
		</div>
	);
}

/** Each managed team as the cards view groups it: the team name with its count, then its member rows. */
function TeamGroupsSkeleton() {
	return (
		<div className="flex w-full flex-col gap-4">
			{TEAM_GROUP_KEYS.map((teamKey) => (
				<div key={teamKey}>
					<div className="flex h-10 items-center gap-2">
						<div className={cn(BAR, 'h-4 w-32')} />
						<div className={cn(BAR, 'h-5 w-6 rounded-sm')} />
					</div>
					<div className="pt-2">
						<ul className={TEAM_LIST_SURFACE}>
							{MEMBER_ROW_KEYS.map((rowKey) => (
								<li key={rowKey}>
									<MemberRowSkeleton />
								</li>
							))}
						</ul>
					</div>
				</div>
			))}
		</div>
	);
}

function MemberBlocksSkeleton() {
	return (
		<div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
			{MEMBER_BLOCK_KEYS.map((key) => (
				<MemberBlockSkeleton key={key} />
			))}
		</div>
	);
}

/** The all teams page while the route, the user or the teams load, in the view the user picked. */
export const AllTeamsPageSkeleton: FC<AllTeamsPageSkeletonProps> = ({ className }) => {
	const view = useAtomValue(allTeamsHeaderTabs);
	const isBlocksView = view === IssuesView.BLOCKS;
	const isCardsView = !isBlocksView;
	return (
		<PageSkeletonFrame
			className={cn('items-start', className)}
			toolbar={<AllTeamsToolbarSkeleton isCardsView={isCardsView} />}
		>
			{isCardsView && <TeamGroupsSkeleton />}
			{isBlocksView && <MemberBlocksSkeleton />}
		</PageSkeletonFrame>
	);
};

export default AllTeamsPageSkeleton;
