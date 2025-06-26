'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { useAuthenticateUser, useLocalStorageState, useOrganizationTeams, useUserProfilePage } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Button, Container, Text } from '@/core/components';
import { ArrowLeftIcon } from 'assets/svg';
import { MainHeader, MainLayout } from '@/core/components/layouts/default-layout';
import Link from 'next/link';
import React, { Suspense, useCallback, useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';

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

export type FilterTab = 'Tasks' | 'Screenshots' | 'Apps' | 'Visited Sites';

// Memoized components to avoid unnecessary re-renders
const MemberNotFoundMessage = memo(({ t }: { t: any }) => (
	<div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2">
		<div className="flex flex-col gap-5 justify-center items-center">
			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{t('common.MEMBER')} {t('common.NOT_FOUND')}!
			</Text>
			<Text className="font-light text-center text-gray-400">{t('pages.profile.MEMBER_NOT_FOUND_MSG_1')}</Text>
			<Button className="m-auto font-normal rounded-lg">
				<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
			</Button>
		</div>
	</div>
));

const BreadcrumbSection = memo(({ breadcrumb }: { breadcrumb: any[] }) => (
	<div className="flex gap-8 items-center">
		<Link href="/">
			<ArrowLeftIcon className="w-6 h-6" />
		</Link>
		<Breadcrumb paths={breadcrumb} className="text-sm" />
	</div>
));

const UserProfileSection = memo(
	({
		profile,
		profileIsAuthUser,
		isTrackingEnabled,
		timerClassName
	}: {
		profile: any;
		profileIsAuthUser: boolean;
		isTrackingEnabled: boolean;
		timerClassName: string;
	}) => (
		<div className="flex flex-col justify-between items-center md:flex-row">
			<LazyUserProfileDetail member={profile.member} />
			{profileIsAuthUser && isTrackingEnabled && (
				<Suspense fallback={<TimerSkeleton />}>
					<LazyTimer className={timerClassName} />
				</Suspense>
			)}
		</div>
	)
);

const ActivityFilterTab = memo(
	({
		filter,
		index,
		activityFilter,
		onFilterChange
	}: {
		filter: string;
		index: number;
		activityFilter: FilterTab;
		onFilterChange: (filter: FilterTab) => void;
	}) => (
		<div key={index} className="flex gap-4 justify-start items-center cursor-pointer">
			{index !== 0 && <VerticalSeparator />}
			<div
				className={cn(
					'text-gray-500 transition-colors duration-200 hover:text-gray-700 dark:hover:text-gray-300',
					activityFilter === filter && 'text-black dark:text-white font-medium'
				)}
				onClick={() => onFilterChange(filter as FilterTab)}
			>
				{filter}
			</div>
		</div>
	)
);

const ActivityFilterTabs = memo(
	({
		activityScreens,
		activityFilter,
		onFilterChange,
		fullWidth
	}: {
		activityScreens: Record<string, React.ReactNode>;
		activityFilter: FilterTab;
		onFilterChange: (filter: FilterTab) => void;
		fullWidth: boolean;
	}) => (
		<Container fullWidth={fullWidth} className="py-8">
			<div className={cn('flex gap-4 justify-start items-center mt-3')}>
				{Object.keys(activityScreens).map((filter, i) => (
					<ActivityFilterTab
						key={`${filter}-${i}`}
						filter={filter}
						index={i}
						activityFilter={activityFilter}
						onFilterChange={onFilterChange}
					/>
				))}
			</div>
		</Container>
	)
);

const MainContent = memo(
	({
		hook,
		activityFilter,
		activityScreen,
		profile,
		fullWidth
	}: {
		hook: any;
		activityFilter: FilterTab;
		activityScreen: React.ReactNode;
		profile: any;
		fullWidth: boolean;
	}) => (
		<Container fullWidth={fullWidth} className="mt-6 mb-10">
			{hook.tab === 'worked' && activityFilter !== 'Tasks' ? (
				activityScreen
			) : (
				<LazyUserProfileTask profile={profile} tabFiltered={hook} paginateTasks={true} />
			)}
		</Container>
	)
);

const Profile = memo(function ProfilePage({ params }: { params: { memberId: string } }) {
	const unwrappedParams = React.use(params as any) as { memberId: string };
	const profile = useUserProfilePage();
	const { user } = useAuthenticateUser();
	const { isTrackingEnabled, activeTeam, activeTeamManagers } = useOrganizationTeams();
	const fullWidth = useAtomValue(fullWidthState);
	const [activityFilter, setActivityFilter] = useLocalStorageState<FilterTab>('activity-filter', 'Tasks');
	const setActivityTypeFilter = useSetAtom(activityTypeState);
	const hook = useTaskFilter(profile);
	const t = useTranslations();

	// Memoization of complex calculations
	const members = useMemo(() => activeTeam?.members, [activeTeam?.members]);

	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.findIndex((member) => member.employee?.user?.id === user?.id),
		[activeTeamManagers, user?.id]
	);

	const canSeeActivity = useMemo(
		() => profile.userProfile?.id === user?.id || isManagerConnectedUser !== -1,
		[isManagerConnectedUser, profile.userProfile?.id, user?.id]
	);

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

	// Memoization of derived values
	const activityScreen = useMemo(() => activityScreens[activityFilter] ?? null, [activityScreens, activityFilter]);

	const profileIsAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);
	const hookFilterType = useMemo(() => hook.filterType, [hook.filterType]);

	// Memoized CSS classes
	const timerClassName = useMemo(
		() => cn('p-5 rounded-2xl shadow-xl card', 'dark:border-[0.125rem] dark:border-[#28292F]', 'dark:bg-[#1B1D22]'),
		[]
	);

	const headerClassName = useMemo(() => cn(hookFilterType && ['pb-0'], '!pt-14'), [hookFilterType]);

	// Memoized render conditions
	const shouldShowSkeleton = useMemo(
		() => (!profile.isAuthUser && !profile.member) || !profile.userProfile,
		[profile.isAuthUser, profile.member, profile.userProfile]
	);

	const shouldShowMemberNotFound = useMemo(
		() => Array.isArray(members) && members.length > 0 && !unwrappedParams.memberId,
		[members, unwrappedParams.memberId]
	);

	const shouldShowActivityTabs = useMemo(() => hook.tab === 'worked' && canSeeActivity, [hook.tab, canSeeActivity]);

	// Memoized callbacks
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

	// Show unified skeleton while initial data is loading
	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (shouldShowSkeleton) {
		return <ProfilePageSkeleton showTimer={profileIsAuthUser && isTrackingEnabled} fullWidth={fullWidth} />;
	}

	// Check if team has members but no specific member found
	if (shouldShowMemberNotFound) {
		return (
			<MainLayout>
				<MemberNotFoundMessage t={t} />
			</MainLayout>
		);
	}

	return (
		<MainLayout
			mainHeaderSlot={
				<MainHeader fullWidth={fullWidth} className={headerClassName}>
					<div className="space-y-4 w-full">
						{/* Breadcrumb */}
						<BreadcrumbSection breadcrumb={breadcrumb} />

						{/* User Profile Detail */}
						<UserProfileSection
							profile={profile}
							profileIsAuthUser={profileIsAuthUser}
							isTrackingEnabled={isTrackingEnabled}
							timerClassName={timerClassName}
						/>

						{/* TaskFilter */}
						<LazyTaskFilter profile={profile} hook={hook} />
					</div>
				</MainHeader>
			}
		>
			{/* Activity Filter Tabs - Second tab system in the page */}
			{shouldShowActivityTabs && (
				<ActivityFilterTabs
					activityScreens={activityScreens}
					activityFilter={activityFilter}
					onFilterChange={changeActivityFilter}
					fullWidth={fullWidth}
				/>
			)}

			<MainContent
				hook={hook}
				activityFilter={activityFilter}
				activityScreen={activityScreen}
				profile={profile}
				fullWidth={fullWidth}
			/>
		</MainLayout>
	);
});

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
