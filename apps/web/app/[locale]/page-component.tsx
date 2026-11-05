'use client';
import React, { Suspense, useEffect } from 'react';

import { useIsMemberManager } from '@/core/hooks';
import { useMyInvitationsQuery } from '@/core/hooks/invitations/use-my-invitations-query';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { clsxm } from '@/core/lib/utils';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { IssuesView, LAST_SELECTED_TEAM_MEMBERS_VIEW_MODE } from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';

import { Analytics } from '@vercel/analytics/react';

import 'react-loading-skeleton/dist/skeleton.css';
import '@/styles/globals.css';

import { useAtom, useAtomValue } from 'jotai';
import HeaderTabs from '@/core/components/common/header-tabs';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { usePathname } from 'next/navigation';
import { Users } from '@/core/components/icons';
// TeamMemberHeader and NoTeam now lazy-loaded below
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { TeamLiveSummary } from '@/core/components/pages/teams/team/team-live-summary';

// Import skeleton components
import TeamMembersSkeleton from '@/core/components/common/skeleton/team-members-skeleton';
import TeamInvitationsSkeleton from '@/core/components/common/skeleton/team-invitations-skeleton';
import TeamNotificationsSkeleton from '@/core/components/common/skeleton/team-notifications-skeleton';
import UnverifiedEmailSkeleton from '@/core/components/common/skeleton/unverified-email-skeleton';
import { TaskTimerSectionSkeleton } from '@/core/components/common/skeleton/task-timer-section-skeleton';
import { TaskTimerSection } from '@/core/components/pages/dashboard/task-timer-section';
import { TeamMemberHeaderSkeleton } from '@/core/components/common/skeleton/team-member-header-skeleton';
import { NoTeamSkeleton } from '@/core/components/common/skeleton/no-team-skeleton';
import { HomePageSkeleton } from '@/core/components/pages/teams/team/home-page-skeleton';
import { AnimatedHeight } from '@/core/components/common/animated-height';
// Import optimized components from centralized location
import {
	LazyTeamOutstandingNotifications,
	LazyTeamMembers,
	LazyTeamInvitations,
	LazyTeamMemberHeader
} from '@/core/components/optimized-components/teams';
import { LazyChatwootWidget, LazyUnverifiedEmail, LazyNoTeam } from '@/core/components/optimized-components/common';
import { activeTeamState, isTeamMemberState, isTrackingEnabledState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

function MainPage() {
	const t = useTranslations();

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	const activeTeam = useAtomValue(activeTeamState);

	const isTeamMember = useAtomValue(isTeamMemberState);

	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id ?? user?.employeeId ?? '';
	const { employeeOutstandingPlans, employeeSortedPlans } = useEmployeeDailyPlans(employeeId);

	const { isTeamManager } = useIsMemberManager(user);

	const { myInvitations: myInvitationsList, refetchMyInvitations } = useMyInvitationsQuery();
	const [view, setView] = useAtom(headerTabs);
	const path = usePathname();
	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: activeTeam?.name || '', href: '/' },
		{ title: t(`common.${view}`), href: `/` }
	];

	useEffect(() => {
		if (view == IssuesView.KANBAN && path == '/') {
			setView(IssuesView.CARDS);
		}
		const lastTeamMembersViewMode = localStorage?.getItem(LAST_SELECTED_TEAM_MEMBERS_VIEW_MODE);
		if (lastTeamMembersViewMode && path == '/') {
			if (
				Object.values(IssuesView).includes(lastTeamMembersViewMode as IssuesView) &&
				lastTeamMembersViewMode != IssuesView.KANBAN
			) {
				setView(lastTeamMembersViewMode as IssuesView);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [path, setView]);

	return (
		<>
			<div className="flex flex-col justify-between h-full min-h-screen">
				{/* <div className="flex-grow"> */}
				<PageLayout
					className="h-full pt-0"
					breadcrumb={
						<div className="flex min-w-0 items-center gap-2">
							<Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							<Breadcrumb paths={breadcrumb} className="min-w-0 text-sm" />
						</div>
					}
					mainHeaderSlot={
						<div>
							<div className="px-4">
								<div className="flex flex-wrap items-center justify-between gap-3 py-3">
									<TeamLiveSummary />
									<HeaderTabs linkAll={false} />
								</div>

								<AnimatedHeight>
									<div className="w-full">
										{/* UnverifiedEmail - Only render when user email is not verified */}
										{user && !user.isEmailVerified && (
											<Suspense fallback={<UnverifiedEmailSkeleton />}>
												<LazyUnverifiedEmail user={user} />
											</Suspense>
										)}

										{/* TeamInvitations - Only render when user has pending invitations */}
										{myInvitationsList && myInvitationsList.length > 0 && (
											<Suspense fallback={<TeamInvitationsSkeleton />}>
												<LazyTeamInvitations
													className="!m-0"
													myInvitationsList={myInvitationsList}
													myInvitations={refetchMyInvitations}
												/>
											</Suspense>
										)}
										{/* TeamOutstandingNotifications - Only render when there are outstanding plans or manager notifications */}
										{((employeeOutstandingPlans && employeeOutstandingPlans.length > 0) ||
											(employeeSortedPlans &&
												employeeSortedPlans.length > 0 &&
												isTeamManager)) && (
											<Suspense fallback={<TeamNotificationsSkeleton />}>
												<LazyTeamOutstandingNotifications
													outstandingPlans={employeeOutstandingPlans}
													dailyPlan={{ items: employeeSortedPlans }}
													isTeamManager={isTeamManager}
													user={user!}
												/>
											</Suspense>
										)}
									</div>
								</AnimatedHeight>

								{isTeamMember ? (
									<Suspense
										fallback={<TaskTimerSectionSkeleton isTrackingEnabled={isTrackingEnabled} />}
									>
										<TaskTimerSection isTrackingEnabled={isTrackingEnabled} />
									</Suspense>
								) : null}
							</div>
							<Suspense fallback={<TeamMemberHeaderSkeleton view={view} />}>
								<LazyTeamMemberHeader view={view} />
							</Suspense>
						</div>
					}
					footerClassName={clsxm('')}
				>
					<LazyChatwootWidget />
					<div className="h-full">
						<div className="mx-auto w-full">
							{isTeamMember ? (
								<Suspense fallback={<TeamMembersSkeleton view={view} />}>
									<LazyTeamMembers kanbanView={view} />
								</Suspense>
							) : (
								<Suspense fallback={<NoTeamSkeleton />}>
									<LazyNoTeam />
								</Suspense>
							)}
						</div>
					</div>
				</PageLayout>
			</div>
			{/* Vercel Web Analytics only exists on Vercel; on the k8s deployments its /_vercel/insights/script.js
			    404s on every page view (gate, don't remove — it comes back the moment the app runs on Vercel). */}
			{process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL ? <Analytics /> : null}
		</>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage', skeleton: HomePageSkeleton });
