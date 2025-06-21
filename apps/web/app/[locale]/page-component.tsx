'use client';
import React, { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { useAuthenticateUser, useDailyPlan, useOrganizationTeams, useTeamInvitations } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { IssuesView } from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';

import { Analytics } from '@vercel/analytics/react';

import 'react-loading-skeleton/dist/skeleton.css';
import '@/styles/globals.css';

import { useAtom } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import HeaderTabs from '@/core/components/common/header-tabs';
import { headerTabs } from '@/core/stores/common/header-tabs';
import { usePathname } from 'next/navigation';
import { PeoplesIcon } from 'assets/svg';
import TeamMemberHeader from '@/core/components/teams/team-member-header';
import NoTeam from '@/core/components/common/no-team';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';

// Import skeleton components
import TeamMembersSkeleton from '@/core/components/common/skeleton/team-members-skeleton';
import TeamInvitationsSkeleton from '@/core/components/common/skeleton/team-invitations-skeleton';
import TeamNotificationsSkeleton from '@/core/components/common/skeleton/team-notifications-skeleton';
import UnverifiedEmailSkeleton from '@/core/components/common/skeleton/unverified-email-skeleton';
import { TaskTimerSectionSkeleton } from '@/core/components/common/skeleton/task-timer-section-skeleton';
import { TaskTimerSection } from '@/core/components/pages/dashboard/task-timer-section';
export const TeamOutstandingNotifications = dynamic(
	() =>
		import('@/core/components/teams/team-outstanding-notifications').then((mod) => ({
			default: mod.TeamOutstandingNotifications
		})),
	{
		ssr: false,
		loading: () => <TeamNotificationsSkeleton />
	}
);
// Lazy loaded components with appropriate loading states
const TeamMembers = dynamic(
	() => import('@/core/components/pages/teams/team/team-members').then((mod) => ({ default: mod.TeamMembers })),
	{
		ssr: false,
		loading: () => <TeamMembersSkeleton />
	}
);

const ChatwootWidget = dynamic(() => import('@/core/components/integration/chatwoot'), {
	ssr: false,
	loading: () => <div /> // No visible loading for chat widget
});

const TeamInvitations = dynamic(
	() => import('@/core/components/teams/team-invitations').then((mod) => ({ default: mod.TeamInvitations })),
	{
		ssr: false,
		loading: () => <TeamInvitationsSkeleton />
	}
);

const UnverifiedEmail = dynamic(
	() => import('@/core/components/common/unverified-email').then((mod) => ({ default: mod.UnverifiedEmail })),
	{
		ssr: false,
		loading: () => <UnverifiedEmailSkeleton />
	}
);

function MainPage() {
	const t = useTranslations();

	const { isTeamMember, isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const { outstandingPlans, dailyPlan } = useDailyPlan();
	const { user, isTeamManager } = useAuthenticateUser();
	const { myInvitationsList, myInvitations } = useTeamInvitations();
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
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
									<div className="flex gap-8 justify-center items-center h-10">
										<PeoplesIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />

										<Breadcrumb paths={breadcrumb} className="text-sm" />
									</div>

									<div className="flex gap-1 justify-center items-center w-max h-10">
										<HeaderTabs linkAll={false} />
									</div>
								</div>

								<div className="mx-8-container">
									<div className="w-full">
										{/* UnverifiedEmail - Only render when user email is not verified */}
										{user && !user.isEmailVerified && (
											<Suspense fallback={<UnverifiedEmailSkeleton />}>
												<UnverifiedEmail user={user} />
											</Suspense>
										)}

										{/* TeamInvitations - Only render when user has pending invitations */}
										{myInvitationsList && myInvitationsList.length > 0 && (
											<Suspense fallback={<TeamInvitationsSkeleton />}>
												<TeamInvitations
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
												<TeamOutstandingNotifications
													outstandingPlans={outstandingPlans}
													dailyPlan={dailyPlan}
													isTeamManager={isTeamManager}
													user={user}
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
								<TeamMemberHeader view={view} />
							</div>
						</div>
					}
					footerClassName={clsxm('')}
				>
					<ChatwootWidget />
					<div className="h-full">
						{isTeamMember ? (
							<Container fullWidth={fullWidth} className="mx-auto">
								<TeamMembers kanbanView={view} />
							</Container>
						) : (
							<NoTeam />
						)}
					</div>
				</MainLayout>
			</div>
			<Analytics />
		</>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
