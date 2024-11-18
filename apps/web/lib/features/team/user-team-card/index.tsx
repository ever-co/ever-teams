'use client';

import { secondsToTime } from '@app/helpers';
import {
	useCollaborative,
	useTMCardTaskEdit,
	useTaskStatistics,
	useOrganizationTeams,
	useAuthenticateUser,
	useTeamMemberCard,
	useUserProfilePage
} from '@app/hooks';
import { IClassName, IOrganizationTeamList, OT_Member } from '@app/interfaces';
import { timerSecondsState, userDetailAccordion as userAccordion } from '@app/stores';
import { clsxm } from '@app/utils';
import { Card, Container, InputField, Text, VerticalSeparator } from 'lib/components';
import { TaskTimes, TodayWorkedTime, UserProfileTask, useTaskFilter } from 'lib/features';
import { useTranslations } from 'next-intl';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { TaskEstimateInfo } from './task-estimate';
import { TaskInfo } from './task-info';
import { UserInfo } from './user-info';
import { UserTeamCardMenu } from './user-team-card-menu';
import React, { useCallback, useState } from 'react';
import UserTeamActivity from './user-team-card-activity';
import { CollapseUpIcon, ExpandIcon } from '@components/ui/svgs/expand';
import { activityTypeState } from '@app/stores/activity-type';
import { SixSquareGridIcon } from 'assets/svg';
import { ChevronDoubleDownIcon } from '@heroicons/react/20/solid';
import { ScreenshootTab } from 'lib/features/activity/screenshoots';
import { AppsTab } from 'lib/features/activity/apps';
import { VisitedSitesTab } from 'lib/features/activity/visited-sites';
import { FilterTab } from '@app/[locale]/profile/[memberId]/page';
import { Loader } from 'lucide-react';
import { fullWidthState } from '@app/stores/fullWidth';

type IUserTeamCard = {
	active?: boolean;
	member?: IOrganizationTeamList['members'][number];
	publicTeam?: boolean;
	members?: IOrganizationTeamList['members'];
	draggable: boolean;
	onDragStart: () => any;
	onDragEnter: () => any;
	onDragEnd: any;
	onDragOver: (e: React.DragEvent<HTMLDivElement>) => any;
	currentExit: boolean;
} & IClassName;

export function UserTeamCard({
	className,
	active,
	member,
	publicTeam = false,
	draggable = false,
	onDragStart = () => null,
	onDragEnd = () => null,
	onDragEnter = () => null,
	onDragOver = () => null
}: IUserTeamCard) {
	const t = useTranslations();
	const profile = useUserProfilePage();
	const [userDetailAccordion, setUserDetailAccordion] = useAtom(userAccordion);
	const hook = useTaskFilter(profile);
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(memberInfo.memberUser);
	const fullWidth = useAtomValue(fullWidthState);

	const seconds = useAtomValue(timerSecondsState);
	const setActivityFilter = useSetAtom(activityTypeState);
	const { activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);
	const [showActivity, setShowActivity] = React.useState<boolean>(false);
	const { activeTeamManagers } = useOrganizationTeams();
	const { user } = useAuthenticateUser();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);

	const showActivityFilter = (type: 'DATE' | 'TICKET', member: OT_Member | null) => {
		setShowActivity((prev) => !prev);
		setUserDetailAccordion('');
		setActivityFilter((prev) => ({
			...prev,
			type,
			member
		}));
	};

	let totalWork = <></>;
	if (memberInfo.isAuthUser) {
		const { h, m } = secondsToTime(
			((member?.totalTodayTasks &&
				member?.totalTodayTasks.reduce(
					(previousValue, currentValue) => previousValue + currentValue.duration,
					0
				)) ||
				activeTaskTotalStat?.duration ||
				0) + addSeconds
		);

		totalWork = (
			<div className={clsxm('flex space-x-2 items-center font-normal flex-col mr-4')}>
				<span className="text-xs text-gray-500">{t('common.TOTAL_TIME')}:</span>
				<Text className="text-xs">
					{h}h : {m}m
				</Text>
			</div>
		);
	}

	const menu = (
		<>
			{(!collaborativeSelect || active) && <UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />}

			{collaborativeSelect && !active && (
				<InputField
					type="checkbox"
					checked={user_selected()}
					className={clsxm('border-none w-4 h-4 mr-1 accent-primary-light', 'border-2 border-primary-light')}
					noWrapper={true}
					onChange={onUserSelect}
				/>
			)}
		</>
	);
	const [activityFilter, setActivity] = useState<FilterTab>('Tasks');

	const activityScreens = {
		Tasks: <UserProfileTask profile={profile} tabFiltered={hook} />,
		Screenshots: <ScreenshootTab />,
		Apps: <AppsTab />,
		'Visited Sites': <VisitedSitesTab />
	};
	const changeActivityFilter = useCallback(
		(filter: FilterTab) => {
			setActivity(filter);
		},
		[setActivity]
	);
	const canSeeActivity = profile.userProfile?.id === user?.id || isManagerConnectedUser != -1;

	return (
		<div
			className={clsxm(!active && 'border-2 border-transparent')}
			draggable={draggable}
			onDragStart={onDragStart}
			onDragEnter={onDragEnter}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
			ref={profile.loadTaskStatsIObserverRef}
		>
			<Card
				shadow="bigger"
				className={clsxm(
					'sm:block hidden transition-all dark:bg-[#1E2025] min-h-[7rem] !py-4',
					active
						? ['border-primary-light border-[0.1875rem]']
						: ['dark:border border border-transparent dark:border-[#FFFFFF14]'],

					className
				)}
			>
				<div className="relative flex items-center m-0">
					<div className="absolute left-0 cursor-pointer">
						<SixSquareGridIcon className="w-2  text-[#CCCCCC] dark:text-[#4F5662]" />
					</div>

					{/* Show user name, email and image */}
					<div className="relative">
						<UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-1/4" publicTeam={publicTeam} />
						{!publicTeam && (
							<div
								onClick={() => {
									setUserDetailAccordion(
										userDetailAccordion == memberInfo.memberUser?.id
											? ''
											: memberInfo.memberUser?.id ?? ''
									);
									setShowActivity(false);
								}}
								className={clsxm('h-6 w-6 absolute right-4 top-0 cursor-pointer p-[3px]')}
							>
								<ChevronDoubleDownIcon
									className={clsxm(
										'h-4 w-4 transition-all',
										userDetailAccordion == memberInfo.memberUser?.id && 'rotate-180'
									)}
								/>
							</div>
						)}
					</div>
					<VerticalSeparator />

					{/* Task information */}
					<div className="flex justify-between items-center flex-1 md:min-w-[25%] xl:min-w-[30%] !max-w-[250px]">
						<TaskInfo
							edition={taskEdition}
							memberInfo={memberInfo}
							className="flex-1 px-2 overflow-y-hidden lg:px-4"
							publicTeam={publicTeam}
							tab="default"
						/>

						{isManagerConnectedUser != 1 ? (
							<p
								className="flex items-center justify-center w-8 h-8 text-center border rounded cursor-pointer dark:border-gray-800"
								onClick={() => {
									showActivityFilter('TICKET', memberInfo.member ?? null);
									setUserDetailAccordion('');
								}}
							>
								{!showActivity ? (
									<ExpandIcon height={24} width={24} />
								) : (
									<CollapseUpIcon height={24} width={24} />
								)}
							</p>
						) : null}
					</div>
					<VerticalSeparator className="ml-2" />

					{/* TaskTimes */}
					<TaskTimes
						activeAuthTask={true}
						memberInfo={memberInfo}
						task={memberInfo.memberTask}
						isAuthUser={memberInfo.isAuthUser}
						className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center"
					/>
					<VerticalSeparator />

					{/* TaskEstimateInfo */}
					<TaskEstimateInfo
						memberInfo={memberInfo}
						edition={taskEdition}
						activeAuthTask={true}
						className="w-1/5 lg:px-3 2xl:w-52 3xl:w-64"
					/>

					<VerticalSeparator />

					{/* TodayWorkedTime */}
					<div className="flex justify-center items-center cursor-pointer w-1/5 gap-4 lg:px-3 2xl:w-52 max-w-[13rem]">
						<TodayWorkedTime isAuthUser={memberInfo.isAuthUser} className="" memberInfo={memberInfo} />
						{isManagerConnectedUser != -1 ? (
							<p
								onClick={() => showActivityFilter('DATE', memberInfo.member ?? null)}
								className="flex items-center justify-center w-8 h-8 text-center border rounded cursor-pointer dark:border-gray-800"
							>
								{!showActivity ? (
									<ExpandIcon height={24} width={24} />
								) : (
									<CollapseUpIcon height={24} width={24} />
								)}
							</p>
						) : null}
					</div>
					{/* Card menu */}
					<div className="absolute right-2">{menu}</div>
				</div>
				{userDetailAccordion == memberInfo.memberUser?.id &&
				memberInfo.memberUser.id == profile.userProfile?.id &&
				!showActivity ? (
					<div className="overflow-y-auto h-96">
						{canSeeActivity && (
							<Container fullWidth={fullWidth} className="py-8">
								<div className={clsxm('flex justify-start items-center gap-4 mt-3')}>
									{Object.keys(activityScreens).map((filter, i) => (
										<div key={i} className="flex items-center justify-start gap-4 cursor-pointer">
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
						{activityScreens[activityFilter] ?? null}
					</div>
				) : userDetailAccordion == memberInfo.memberUser?.id ? (
					<div className="flex items-center justify-center w-full h-20">
						<Loader className="animate-spin" />
					</div>
				) : null}
				<UserTeamActivity showActivity={showActivity} member={member} />
			</Card>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative flex py-3 sm:hidden flex-col',
					active && ['border-primary-light border-[2px]'],
					className
				)}
			>
				<div className="flex items-center justify-between mb-4">
					<UserInfo memberInfo={memberInfo} publicTeam={publicTeam} className="w-9/12" />
					{/*@ts-ignore*/}
					{totalWork}
				</div>

				<div className="flex flex-wrap items-start justify-between pb-4 border-b">
					<TaskInfo
						edition={taskEdition}
						memberInfo={memberInfo}
						className="px-4"
						publicTeam={publicTeam}
						tab="default"
					/>
				</div>

				<div className="flex justify-between mt-4 mb-4 space-x-5">
					<div className="flex space-x-4">
						<TaskTimes
							activeAuthTask={true}
							memberInfo={memberInfo}
							task={memberInfo.memberTask}
							isAuthUser={memberInfo.isAuthUser}
						/>
					</div>

					<TaskEstimateInfo memberInfo={memberInfo} edition={taskEdition} activeAuthTask={true} />
				</div>

				{/* Card menu */}
				<div className="absolute right-2">{menu}</div>
			</Card>
			{/* {currentExit && (
				<HorizontalSeparator className="mt-2 !border-primary-light dark:!border-primary-light !border-t-2" />
			)} */}
		</div>
	);
}
