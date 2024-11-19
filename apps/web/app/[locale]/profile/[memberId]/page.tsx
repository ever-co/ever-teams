'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { useAuthenticateUser, useDailyPlan, useOrganizationTeams, useUserProfilePage } from '@app/hooks';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Button, Container, Text, VerticalSeparator } from 'lib/components';
import { ArrowLeftIcon } from 'assets/svg';
import { TaskFilter, Timer, UserProfileTask, useTaskFilter } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import Link from 'next/link';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAtomValue, useSetAtom } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { ScreenshootTab } from 'lib/features/activity/screenshoots';
import { AppsTab } from 'lib/features/activity/apps';
import { VisitedSitesTab } from 'lib/features/activity/visited-sites';
import { activityTypeState } from '@app/stores/activity-type';
import { UserProfileDetail } from './components/UserProfileDetail';
import { cn } from 'lib/utils';
// import { ActivityCalendar } from 'lib/features/activity/calendar';

export type FilterTab = 'Tasks' | 'Screenshots' | 'Apps' | 'Visited Sites';

const Profile = React.memo(function ProfilePage({ params }: { params: { memberId: string } }) {
	const profile = useUserProfilePage();
	const [headerSize] = useState(10);
	const { user } = useAuthenticateUser();
	const { isTrackingEnabled, activeTeam, activeTeamManagers } = useOrganizationTeams();
	const members = activeTeam?.members;
	const { getEmployeeDayPlans } = useDailyPlan();
	const fullWidth = useAtomValue(fullWidthState);
	const [activityFilter, setActivityFilter] = useState<FilterTab>('Tasks');
	const setActivityTypeFilter = useSetAtom(activityTypeState);
	const hook = useTaskFilter(profile);

	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id),
		[activeTeamManagers, user?.id]
	);
	const canSeeActivity = useMemo(
		() => profile.userProfile?.id === user?.id || isManagerConnectedUser != -1,
		[isManagerConnectedUser, profile.userProfile?.id, user?.id]
	);

	const t = useTranslations();
	const breadcrumb = useMemo(
		() => [
			{ title: activeTeam?.name || '', href: '/' },
			{
				title: JSON.parse(t('pages.profile.BREADCRUMB')) || '',
				href: `/profile/${params.memberId}`
			}
		],
		[activeTeam?.name, params.memberId, t]
	);

	const activityScreens = useMemo(
		() => ({
			Tasks: <UserProfileTask profile={profile} tabFiltered={hook} />,
			Screenshots: <ScreenshootTab />,
			Apps: <AppsTab />,
			'Visited Sites': <VisitedSitesTab />
		}),
		[hook, profile]
	);

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

	React.useEffect(() => {
		getEmployeeDayPlans(profile.member?.employeeId ?? '');
	}, [getEmployeeDayPlans, profile.member?.employeeId]);

	if (Array.isArray(members) && members.length && !profile.member) {
		return (
			<MainLayout>
				<div
					ref={profile.loadTaskStatsIObserverRef}
					className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2"
				>
					<div className="flex flex-col items-center justify-center gap-5">
						<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
							{t('common.MEMBER')} {t('common.NOT_FOUND')}!
						</Text>

						<Text className="font-light text-center text-gray-400 ">
							{t('pages.profile.MEMBER_NOT_FOUND_MSG_1')}
						</Text>

						<Button className="m-auto font-normal rounded-lg ">
							<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
						</Button>
					</div>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout
			showTimer={(headerSize <= 11.8 && isTrackingEnabled) || !profileIsAuthUser}
			mainHeaderSlot={
				<MainHeader fullWidth={fullWidth} className={cn(hookFilterType && ['pb-0'], 'pb-2 !-mt-12')}>
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
							<UserProfileDetail member={profile.member} />

							{profileIsAuthUser && isTrackingEnabled && (
								<Timer
									className={cn(
										'p-5 rounded-2xl shadow-xlcard',
										'dark:border-[0.125rem] dark:border-[#28292F]',
										'dark:bg-[#1B1D22]'
									)}
								/>
							)}
						</div>
						{/* TaskFilter */}
						<TaskFilter profile={profile} hook={hook} />
					</div>
				</MainHeader>
			}
		>
			{/* <div className="p-1">
								<ActivityCalendar />
							</div> */}
			{hook.tab == 'worked' && canSeeActivity && (
				<Container fullWidth={fullWidth} className="py-8">
					<div className={cn('flex justify-start items-center gap-4 mt-3')}>
						{Object.keys(activityScreens).map((filter, i) => (
							<div key={i} className="flex items-center justify-start gap-4 cursor-pointer">
								{i !== 0 && <VerticalSeparator />}
								<div
									className={cn(
										'text-gray-500',
										activityFilter == filter && 'text-black dark:text-white'
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

			<Container fullWidth={fullWidth} className="mb-10 -mt-6">
				{hook.tab !== 'worked' || activityFilter == 'Tasks' ? (
					<UserProfileTask profile={profile} tabFiltered={hook} paginateTasks={true} />
				) : (
					activityScreens[activityFilter] ?? null
				)}
			</Container>
		</MainLayout>
	);
});

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
