'use client';
import React, { Suspense, useEffect } from 'react';

import { useDailyPlan, useIsMemberManager, useTeamInvitations } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { IssuesView } from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';

import { Analytics } from '@vercel/analytics/react';

import 'react-loading-skeleton/dist/skeleton.css';
import '@/styles/globals.css';

import { useAtom, useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import HeaderTabs from '@/core/components/common/header-tabs';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { usePathname } from 'next/navigation';
import { PeoplesIcon } from 'assets/svg';
// TeamMemberHeader and NoTeam now lazy-loaded below
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';

// Import skeleton components
import TeamMembersSkeleton from '@/core/components/common/skeleton/team-members-skeleton';
import TeamInvitationsSkeleton from '@/core/components/common/skeleton/team-invitations-skeleton';
import TeamNotificationsSkeleton from '@/core/components/common/skeleton/team-notifications-skeleton';
import UnverifiedEmailSkeleton from '@/core/components/common/skeleton/unverified-email-skeleton';
import { TaskTimerSectionSkeleton } from '@/core/components/common/skeleton/task-timer-section-skeleton';
import { TaskTimerSection } from '@/core/components/pages/dashboard/task-timer-section';
import { TeamMemberHeaderSkeleton } from '@/core/components/common/skeleton/team-member-header-skeleton';
import { NoTeamSkeleton } from '@/core/components/common/skeleton/no-team-skeleton';
// Import optimized components from centralized location
import {
	LazyTeamOutstandingNotifications,
	LazyTeamMembers,
	LazyTeamInvitations,
	LazyTeamMemberHeader
} from '@/core/components/optimized-components/teams';
import { LazyChatwootWidget, LazyUnverifiedEmail, LazyNoTeam } from '@/core/components/optimized-components/common';
import { activeTeamState, isTeamMemberState, isTrackingEnabledState, myInvitationsState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

function MainPage() {
	const t = useTranslations();

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	const activeTeam = useAtomValue(activeTeamState);

	const isTeamMember = useAtomValue(isTeamMemberState);

	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id ?? user?.employeeId ?? '';
	const { dailyPlan, outstandingPlans } = useDailyPlan(employeeId);

	const { isTeamManager } = useIsMemberManager(user);

	const myInvitationsList = useAtomValue(myInvitationsState);
	const { myInvitations } = useTeamInvitations();
	const [fullWidth, setFullWidth] = useAtom(fullWidthState);
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [path, setView]);

	React.useEffect(() => {
		window && window?.localStorage.getItem('conf-fullWidth-mode');
		setFullWidth(JSON.parse(window?.localStorage.getItem('conf-fullWidth-mode') || 'true'));
	}, [setFullWidth]);

	return (
		<>
			<div className="flex flex-col justify-between h-full min-h-screen">
				{/* <div className="flex-grow"> */}
				<MainLayout
					className="h-full"
					mainHeaderSlot={
						<div className="bg-white dark:bg-dark-high">
							<div className={clsxm('bg-white dark:bg-dark-high ', !fullWidth && 'x-container')}>
								<div className="mx-8-container my-3 !px-0 flex flex-row items-start justify-between ">
									<div className="flex items-center justify-center h-10 gap-8">
										<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />

										<Breadcrumb paths={breadcrumb} className="text-sm" />
									</div>

									<div className="flex items-center justify-center h-10 gap-1 w-max">
										<HeaderTabs linkAll={false} />
									</div>
								</div>

								<div className="mx-8-container">
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
													myInvitations={myInvitations}
												/>
											</Suspense>
										)}
										{/* TeamOutstandingNotifications - Only render when there are outstanding plans or manager notifications */}
										{((outstandingPlans && outstandingPlans.length > 0) ||
											(dailyPlan?.items && dailyPlan.items.length > 0 && isTeamManager)) && (
											<Suspense fallback={<TeamNotificationsSkeleton />}>
												<LazyTeamOutstandingNotifications
													outstandingPlans={outstandingPlans}
													dailyPlan={dailyPlan}
													isTeamManager={isTeamManager}
													user={user!}
												/>
											</Suspense>
										)}
									</div>

									{isTeamMember ? (
										<Suspense
											fallback={
												<TaskTimerSectionSkeleton isTrackingEnabled={isTrackingEnabled} />
											}
										>
											<TaskTimerSection isTrackingEnabled={isTrackingEnabled} />
										</Suspense>
									) : null}
								</div>
								<Suspense fallback={<TeamMemberHeaderSkeleton view={view} fullWidth={fullWidth} />}>
									<LazyTeamMemberHeader view={view} />
								</Suspense>
							</div>
						</div>
					}
					footerClassName={clsxm('')}
				>
					<LazyChatwootWidget />
					<div className="h-full">
						<Container fullWidth={fullWidth} className="mx-auto">
							{isTeamMember ? (
								<Suspense fallback={<TeamMembersSkeleton view={view} fullWidth={fullWidth} />}>
									<LazyTeamMembers kanbanView={view} />
								</Suspense>
							) : (
								<Suspense fallback={<NoTeamSkeleton fullWidth={fullWidth} />}>
									<LazyNoTeam />
								</Suspense>
							)}
						</Container>
					</div>
				</MainLayout>
			</div>
			<Analytics />
		</>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
