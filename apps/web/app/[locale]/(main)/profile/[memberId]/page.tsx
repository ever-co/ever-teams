'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { Container } from '@/core/components';
import { ProfileErrorBoundary } from '@/core/components/common/profile-error-boundary';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { MainHeader, MainLayout } from '@/core/components/layouts/default-layout';
import { useLocalStorageState, useUserProfilePage } from '@/core/hooks';
import { useProfileValidation } from '@/core/hooks/users/use-profile-validation';
import { ArrowLeftIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React, { Suspense, useCallback, useMemo } from 'react';

import { ProfilePageSkeleton } from '@/core/components/common/skeleton/profile-page-skeleton';
import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import {
	LazyAppsTab,
	LazyScreenshootTab,
	LazyTaskFilter,
	LazyTimer,
	LazyUserProfileDetail,
	LazyUserProfileTask,
	LazyVisitedSitesTab
} from '@/core/components/optimized-components';
import { useActiveTeamManagers } from '@/core/hooks/organizations/teams/use-active-team-managers';
import { useCurrentTeam } from '@/core/hooks/organizations/teams/use-current-team';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { cn } from '@/core/lib/helpers';
import { isTrackingEnabledState } from '@/core/stores';
import { fullWidthState } from '@/core/stores/common/full-width';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { useAtomValue, useSetAtom } from 'jotai';

export type FilterTab = 'Tasks' | 'Screenshots' | 'Apps' | 'Visited Sites';

const Profile = React.memo(function ProfilePage({ params }: { params: { memberId: string } }) {
	const unwrappedParams = React.use(params as any) as { memberId: string };
	const { data: user } = useUserQuery();

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	// Use our new validation hook
	const profileValidation = useProfileValidation(unwrappedParams.memberId);

	// const { filteredTeams, userManagedTeams } = useOrganizationAndTeamManagers();
	const activeTeam = useCurrentTeam();
	const profileUser = profileValidation.member?.employee?.user ?? null;

	const profile = useUserProfilePage();

	const { managers: activeTeamManagers } = useActiveTeamManagers();

	const fullWidth = useAtomValue(fullWidthState);
	const [activityFilter, setActivityFilter] = useLocalStorageState<FilterTab>('activity-filter', 'Tasks');
	const setActivityTypeFilter = useSetAtom(activityTypeState);
	const hook = useTaskFilter(profile);

	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.findIndex((member) => member.employee?.user?.id === user?.id),
		[activeTeamManagers, user?.id]
	);
	const canSeeActivity = useMemo(
		() => profile.userProfile?.id === user?.id || isManagerConnectedUser !== -1,
		[isManagerConnectedUser, profile.userProfile?.id, user?.id]
	);

	const t = useTranslations();
	const breadcrumb = useMemo(
		() => [
			{ title: activeTeam?.name || '', href: '/' },
			{
				title: JSON.parse(t('pages.profile.BREADCRUMB')) || '',
				href: `/profile/${unwrappedParams.memberId}`
			}
		],
		[activeTeam?.name, unwrappedParams.memberId, t]
	);

	const activityScreens = useMemo(
		() => ({
			Tasks: (
				<LazyUserProfileTask
					profile={profile}
					tabFiltered={hook}
					user={profileUser}
					employeeId={profileValidation.member?.employeeId ?? undefined}
				/>
			),
			Screenshots: <LazyScreenshootTab />,
			Apps: <LazyAppsTab />,
			'Visited Sites': <LazyVisitedSitesTab />
		}),
		[hook, profile, profileUser, profileValidation.member?.employeeId]
	);

	const activityScreen = activityScreens[activityFilter] ?? null;
	const profileIsAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);
	const hookFilterType = useMemo(() => hook.filterType, [hook.filterType]);

	const changeActivityFilter = useCallback(
		(filter: FilterTab) => {
			setActivityFilter(filter);
		},
		[setActivityFilter]
	);

	React.useEffect(() => {
		setActivityTypeFilter((prev) => ({
			...prev,
			member: profile.member ? profile.member : null
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profile.member]);

	// Handle error states with our new boundary component
	if (!profileValidation.isValid) {
		// Show loading skeleton for loading state
		if (profileValidation.state === 'loading') {
			return <ProfilePageSkeleton showTimer={profileIsAuthUser && isTrackingEnabled} fullWidth={fullWidth} />;
		}

		// Show error boundary for all other error states
		return (
			<ProfileErrorBoundary
				validation={profileValidation}
				loadTaskStatsIObserverRef={profile.loadTaskStatsIObserverRef}
			>
				<div>This will never render due to validation.isValid being false</div>
			</ProfileErrorBoundary>
		);
	}

	// Additional check for userProfile (keep existing logic)
	if (!profile.userProfile) {
		return <ProfilePageSkeleton showTimer={profileIsAuthUser && isTrackingEnabled} fullWidth={fullWidth} />;
	}

	return (
		<MainLayout
			mainHeaderSlot={
				<MainHeader fullWidth={fullWidth} className={cn(hookFilterType && ['pb-0'], '!pt-14')}>
					<div className="w-full space-y-4">
						{/* Breadcrumb */}
						<div className="flex items-center gap-8">
							<Link href="/">
								<ArrowLeftIcon className="w-6 h-6" />
							</Link>

							<Breadcrumb paths={breadcrumb} className="text-sm" />
						</div>

						{/* User Profile Detail */}
						<div className="flex flex-col items-center justify-between md:flex-row">
							<LazyUserProfileDetail member={profile.member} />

							{profileIsAuthUser && isTrackingEnabled && (
								<Suspense fallback={<TimerSkeleton />}>
									<LazyTimer
										className={cn(
											'p-5 rounded-2xl shadow-xl card',
											'dark:border-[0.125rem] dark:border-[#28292F]',
											'dark:bg-[#1B1D22]'
										)}
									/>
								</Suspense>
							)}
						</div>
						{/* TaskFilter */}
						<LazyTaskFilter profile={profile} hook={hook} />
					</div>
				</MainHeader>
			}
		>
			{/* Activity Filter Tabs - Second tab system in the page */}
			{hook.tab == 'worked' && canSeeActivity && (
				<Container fullWidth={fullWidth} className="py-8">
					<div className={cn('flex gap-4 justify-start items-center mt-3')}>
						{Object.keys(activityScreens).map((filter, i) => (
							<div key={i} className="flex items-center justify-start gap-4 cursor-pointer">
								{i !== 0 && <VerticalSeparator />}
								<div
									className={cn(
										'text-gray-500 transition-colors duration-200 hover:text-gray-700 dark:hover:text-gray-300',
										activityFilter == filter && 'text-black dark:text-white font-medium'
									)}
									onClick={() => changeActivityFilter(filter as FilterTab)}
								>
									{filter}
								</div>
							</div>
						))}
					</div>
				</Container>
			)}
			<Container fullWidth={fullWidth} className="mt-6 mb-10">
				{hook.tab === 'worked' && activityFilter !== 'Tasks' ? (
					activityScreen
				) : (
					<LazyUserProfileTask
						profile={profile}
						tabFiltered={hook}
						paginateTasks={true}
						user={profileUser}
						employeeId={profileValidation.member?.employeeId ?? undefined}
					/>
				)}
			</Container>
		</MainLayout>
	);
});

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
