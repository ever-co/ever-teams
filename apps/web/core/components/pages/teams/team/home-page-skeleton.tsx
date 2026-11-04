'use client';

import { useAtomValue } from 'jotai';
import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { ViewSwitchSkeleton } from '@/core/components/teams/member-row-skeleton';
import { TaskTimerSectionSkeleton } from '@/core/components/common/skeleton/task-timer-section-skeleton';
import { TeamMemberHeaderSkeleton } from '@/core/components/common/skeleton/team-member-header-skeleton';
import TeamMembersSkeleton from '@/core/components/common/skeleton/team-members-skeleton';
import { NoTeamSkeleton } from '@/core/components/common/skeleton/no-team-skeleton';
import { IssuesView } from '@/core/constants/config/constants';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { isTeamMemberState, isTrackingEnabledState } from '@/core/stores';
import { TeamLiveSummarySkeleton } from './team-live-summary';

/** Cards, table, blocks and the Kanban link of the home view switch. */
const HOME_VIEW_COUNT = 4;

type HomeSkeletonState = Readonly<{ view: IssuesView; isTeamMember: boolean; isTrackingEnabled: boolean }>;

/** The home toolbar band while it loads: the team summary and the view switch, the task block, the column labels. */
function HomeToolbarSkeleton({ view, isTeamMember, isTrackingEnabled }: HomeSkeletonState) {
	return (
		<div>
			<div className="px-4">
				<div className="flex flex-wrap items-center justify-between gap-3 py-3">
					<TeamLiveSummarySkeleton />
					<ViewSwitchSkeleton iconCount={HOME_VIEW_COUNT} />
				</div>
				{isTeamMember && <TaskTimerSectionSkeleton isTrackingEnabled={isTrackingEnabled} />}
			</div>
			<TeamMemberHeaderSkeleton view={view} />
		</div>
	);
}

/**
 * The home page while the route, the user or the team loads: the frame and the toolbar band of the loaded page, then
 * the member list of the view the user picked, so every block fills in where it already stands.
 */
export function HomePageSkeleton() {
	const view = useAtomValue(headerTabs);
	const isTeamMember = useAtomValue(isTeamMemberState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const toolbar = (
		<HomeToolbarSkeleton view={view} isTeamMember={isTeamMember} isTrackingEnabled={isTrackingEnabled} />
	);
	return (
		<div className="flex h-full min-h-screen flex-col justify-between">
			<PageSkeletonFrame className="h-full pt-0" toolbar={toolbar}>
				<div className="h-full">
					<div className="mx-auto w-full">
						{isTeamMember && <TeamMembersSkeleton view={view} />}
						{!isTeamMember && <NoTeamSkeleton />}
					</div>
				</div>
			</PageSkeletonFrame>
		</div>
	);
}
