'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { useLocalStorageState, useUserProfilePage } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { ArrowLeftIcon } from 'assets/svg';
import { MainHeader, MainLayout } from '@/core/components/layouts/default-layout';
import Link from 'next/link';
import React, { Suspense, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useProfileValidation } from '@/core/hooks/users/use-profile-validation';
import { ProfileErrorBoundary } from '@/core/components/common/profile-error-boundary';

import { useAtomValue, useSetAtom } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { cn } from '@/core/lib/helpers';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { ProfilePageSkeleton } from '@/core/components/common/skeleton/profile-page-skeleton';
import { TimerSkeleton } from '@/core/components/common/skeleton/timer-skeleton';
import {
	LazyAppsTab,
	LazyScreenshootTab,
	LazyUserProfileTask,
	LazyUserProfileDetail,
	LazyVisitedSitesTab,
	LazyTimer,
	LazyTaskFilter
} from '@/core/components/optimized-components';
import { activeTeamManagersState, activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

export type FilterTab = 'Tasks' | 'Screenshots' | 'Apps' | 'Visited Sites';

const Profile = React.memo(function ProfilePage({ params }: { params: { memberId: string } }) {
	const unwrappedParams = React.use(params as any) as { memberId: string };
	const { data: user } = useUserQuery();

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	// Use our new validation hook
	const profileValidation = useProfileValidation(unwrappedParams.memberId);

	// const { filteredTeams, userManagedTeams } = useOrganizationAndTeamManagers();
	const activeTeam = useAtomValue(activeTeamState);
	const profileUser = profileValidation.member?.employee?.user ?? null;

	const profile = useUserProfilePage();
	const activeTeamManagers = useAtomValue(activeTeamManagersState);

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
			Tasks: <LazyUserProfileTask profile={profile} tabFiltered={hook} />,
			Screenshots: <LazyScreenshootTab />,
			Apps: <LazyAppsTab />,
			'Visited Sites': <LazyVisitedSitesTab />
		}),
		[hook, profile]
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
					<div className="space-y-4 w-full">
						{/* Breadcrumb */}
						<div className="flex gap-8 items-center">
							<Link href="/">
								<ArrowLeftIcon className="w-6 h-6" />
							</Link>

							<Breadcrumb paths={breadcrumb} className="text-sm" />
						</div>

						{/* User Profile Detail */}
						<div className="flex flex-col justify-between items-center md:flex-row">
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
							<div key={i} className="flex gap-4 justify-start items-center cursor-pointer">
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
						user={profileUser?.employee?.user}
					/>
				)}
			</Container>
		</MainLayout>
	);
});

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
