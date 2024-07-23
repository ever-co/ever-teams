'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { imgTitle } from '@app/helpers';
import {
	useAuthenticateUser,
	useDailyPlan,
	useOrganizationTeams,
	useTimer, useUserProfilePage,
	useModal,
	useTeamTasks,
	useTimerView
} from '@app/hooks';
import { ITimerStatusEnum, OT_Member, DailyPlanStatusEnum } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import clsx from 'clsx';
import { withAuthentication } from 'lib/app/authenticator';
import { Avatar, Breadcrumb, Button, Container, Text, VerticalSeparator, Modal, Card } from 'lib/components';
import { ArrowLeftIcon } from 'assets/svg';
import { TaskFilter, Timer, TimerStatus, UserProfileTask, getTimerStatusValue, useTaskFilter } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import Link from 'next/link';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { I_TaskFilter } from 'lib/features/task/task-filters';

import { useRecoilValue, useSetRecoilState } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { ScreenshootTab } from 'lib/features/activity/screenshoots';
import { AppsTab } from 'lib/features/activity/apps';
import { VisitedSitesTab } from 'lib/features/activity/visited-sites';
import { activityTypeState } from '@app/stores/activity-type';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@components/ui/resizable';
import { Button as ButtonPlan } from '@components/ui/button';
import { AddWorkTimeAndEstimatesToPlan } from 'lib/features/daily-plan/plans-work-time-and-estimate';
import { ReloadIcon } from '@radix-ui/react-icons';

export type FilterTab = 'Tasks' | 'Screenshots' | 'Apps' | 'Visited Sites';

const Profile = React.memo(function ProfilePage({ params }: { params: { memberId: string } }) {
	const profile = useUserProfilePage();

	const [headerSize, setHeaderSize] = useState(10);

	const { user } = useAuthenticateUser();
	const { isTrackingEnabled, activeTeam, activeTeamManagers } = useOrganizationTeams();
	const members = activeTeam?.members;
	const fullWidth = useRecoilValue(fullWidthState);
	const [activityFilter, setActivityFilter] = useState<FilterTab>('Tasks');
	const setActivityTypeFilter = useSetRecoilState(activityTypeState);
	const hook = useTaskFilter(profile);

	const { getEmployeeDayPlans } = useDailyPlan();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);
	const canSeeActivity = profile.userProfile?.id === user?.id || isManagerConnectedUser != -1;
	const t = useTranslations();
	const breadcrumb = [
		{ title: activeTeam?.name || '', href: '/' },
		{ title: JSON.parse(t('pages.profile.BREADCRUMB')) || '', href: `/profile/${params.memberId}` }
	];

	const activityScreens = {
		Tasks: <UserProfileTask profile={profile} tabFiltered={hook} />,
		Screenshots: <ScreenshootTab />,
		Apps: <AppsTab />,
		'Visited Sites': <VisitedSitesTab />
	};

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

	return (
		<>

			{Array.isArray(members) && members.length && !profile.member ? (
				<MainLayout>
					<div className=" absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2">
						<div className="flex flex-col justify-center items-center gap-5">
							<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
								{t('common.MEMBER')} {t('common.NOT_FOUND')}!
							</Text>

							<Text className=" font-light text-center text-gray-400">
								{t('pages.profile.MEMBER_NOT_FOUND_MSG_1')}
							</Text>
							<Text className=" font-light text-center text-gray-400">
								{t('pages.profile.MEMBER_NOT_FOUND_MSG_1')}
							</Text>

							<Button className="m-auto font-normal rounded-lg ">
								<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
							</Button>
						</div>
					</div>
				</MainLayout>
			) : (
				<MainLayout showTimer={profileIsAuthUser && isTrackingEnabled}>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel
							defaultSize={30}
							maxSize={48}
							className={clsxm(headerSize < 20 ? '!overflow-hidden' : '!overflow-visible')}
							onResize={(size) => setHeaderSize(size)}
						>
							<MainHeader fullWidth={fullWidth} className={clsxm(hookFilterType && ['pb-0'], 'pb-2')}>
								{/* Breadcrumb */}
								<div className="flex items-center gap-8">
									<Link href="/">
										<ArrowLeftIcon className="w-6 h-6" />
									</Link>

									<Breadcrumb paths={breadcrumb} className="text-sm" />

								</div>

								{/* User Profile Detail */}
								<div className="flex flex-col items-center justify-between py-5 md:py-10 md:flex-row">
									<UserProfileDetail member={profile.member} />
									{profileIsAuthUser && isTrackingEnabled && (
										<Timer
											className={clsxm(
												'p-5 rounded-2xl shadow-xlcard',
												'dark:border-[0.125rem] dark:border-[#28292F]',
												'dark:bg-[#1B1D22]'
											)}
										/>
									)}
								</div>
								{/* TaskFilter */}
								<TaskFilter profile={profile} hook={hook} />
							</MainHeader>
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={65} maxSize={95} className="!overflow-y-scroll custom-scrollbar">
							{hook.tab == 'worked' && canSeeActivity && (
								<Container fullWidth={fullWidth} className="py-8">
									<div className={clsxm('flex justify-start items-center gap-4 mt-3')}>
										{Object.keys(activityScreens).map((filter, i) => (
											<div
												key={i}
												className="flex cursor-pointer justify-start items-center gap-4"
											>
												{i !== 0 && <VerticalSeparator />}
												<div
													className={clsxm(
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

							<Container fullWidth={fullWidth} className="mb-10">
								{hook.tab !== 'worked' || activityFilter == 'Tasks' ? (
									<UserProfileTask profile={profile} tabFiltered={hook} />
								) : (
									activityScreens[activityFilter] ?? null
								)}
							</Container>
						</ResizablePanel>
					</ResizablePanelGroup>
				</MainLayout>
			)}
		</>
	);
});

function UserProfileDetail({ member }: { member?: OT_Member }) {
	const user = useMemo(() => member?.employee.user, [member?.employee.user]);
	const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
	const imgUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const size = 100;
	const { timerStatus } = useTimer();
	const timerStatusValue: ITimerStatusEnum = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, false);
	}, [timerStatus, member]);

	return (
		<div className="flex items-center mb-4 space-x-4 md:mb-0">
			<div
				className={clsx(
					`w-[100px] h-[100px]`, // removed the size variable from width and height, as passing variables is not supported by tailwind
					'flex justify-center items-center relative',
					'rounded-full text-white',
					'shadow-md text-7xl dark:text-6xl font-thin font-PlusJakartaSans ',
					!imageUrl && 'dark:border-[0.375rem] dark:border-[#26272C]'
				)}
				style={{
					backgroundColor: `${stc(userName)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar
						size={size}
						className="relative dark:border-[0.375rem] dark:border-[#26272C]"
						imageUrl={imageUrl}
						alt={userName}
						imageTitle={userName.charAt(0)}
					>
						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 bottom-3 right-[10%] -mb-5 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="mt-24 dark:mt-20 mr-3"
						/>
					</Avatar>
				) : (
					<>
						{imgTitle(userName).charAt(0)}
						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="absolute -bottom-[0.625rem] dark:-bottom-[0.75rem] right-[10%] w-[1.875rem] h-[1.875rem] rounded-full"
						/>
					</>
				)}
			</div>

			<div className="flex flex-col gap-3.5">
				<Text.Heading as="h3" className="text-2xl md:text-4xl">
					{user?.firstName} {user?.lastName}
				</Text.Heading>
				<Text className="text-lg text-gray-500">{user?.email}</Text>
			</div>
		</div>
	);
}

export function CheckPlans({ hook }: { hook: I_TaskFilter }) {
	const { user } = useAuthenticateUser();
	const prof = useUserProfilePage();
	const { isOpen, openModal, closeModal } = useModal();
	const { getEmployeeDayPlans, todayPlan } = useDailyPlan();
	const modes = ['noPlan', 'noEstimation', 'idle'];
	const [modeKey, setModeKey] = React.useState(0);
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();
	const { activeTeam } = useTeamTasks();
	const member = activeTeam?.members.find((member) => member.employee.userId === user?.id);
	const [canShowModal, setCanShowModal] = useState(false);

	const {
		startTimer
	} = useTimerView();

	React.useEffect(() => {
		const timer = setTimeout(() => {
			setCanShowModal(true);
		}, 10000);
		return () => clearTimeout(timer);
	}, []);

	React.useEffect(() => {
		getEmployeeDayPlans(prof.member?.employeeId ?? '');
	}, [getEmployeeDayPlans, prof.member?.employeeId]);

	React.useEffect(() => {
		const today = new Date().toISOString().split('T')[0];
		const lastActionDate = localStorage.getItem('lastActionDate');
		const lastPlanedTimeDate = localStorage.getItem('lastPlanedTimeDate');

		if (canShowModal) {
			if (lastActionDate !== today && todayPlan?.length === 0) {
				localStorage.setItem('lastActionDate', today);
				openModal();
				setModeKey(0);
			} else if (todayPlan?.length > 0 && lastPlanedTimeDate !== today) {
				localStorage.setItem('lastPlanedTimeDate', today);
				openModal();
				setModeKey(1);
			}
		}

	}, [todayPlan, canShowModal]);

	const createPlanRedirect = useCallback(
		async (values: any) => {
			hook.setTab("assigned");
			const toDay = new Date();
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned) || 0,
				date: toDay,
				status: DailyPlanStatusEnum.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: member?.employeeId,
				organizationId: member?.organizationId
			}).then(() => {
				closeModal();
			});
		},
		[closeModal, createDailyPlan, member?.employeeId, member?.organizationId, user?.tenantId]
	);

	return (
		<>
			{
				modes[modeKey] === 'noPlan' ?
					(
						<Modal
							isOpen={isOpen}
							closeModal={closeModal}
							title={''}
							className="bg-light--theme-light flex top-[-100px] items-center dark:bg-dark--theme-light py-5 rounded-xl w-[70vw] h-[auto] justify-start"
							titleClass="text-[16px] font-bold"
						>
							<Card className="w-full" shadow="custom">
								<div className="flex items-center justify-between">
									<Text.Heading as="h3" className="mb-3 text-center">
										Please create a Plan for Today
									</Text.Heading>
									<ButtonPlan
										variant="default"
										className="p-7 font-normal rounded-xl text-md"
										disabled={createDailyPlanLoading}
										onClick={createPlanRedirect}
									>
										{createDailyPlanLoading && <ReloadIcon className="animate-spin mr-2 h-4 w-4" />}
										Create the Plan
									</ButtonPlan>
								</div>
							</Card>
						</Modal>
					)
					: modes[modeKey] === 'noEstimation' ? (
						<AddWorkTimeAndEstimatesToPlan
							closeModal={closeModal}
							open={isOpen}
							plan={todayPlan[0]}
							startTimer={startTimer}
							hasPlan={true}
							cancelBtn={true}
						/>
					) : <></>
			}
		</>

	)
}

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
