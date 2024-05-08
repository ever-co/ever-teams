'use client';

import { secondsToTime } from '@app/helpers';
import {
	useCollaborative,
	useTMCardTaskEdit,
	useTaskStatistics,
	useOrganizationTeams,
	useAuthenticateUser,
	useTeamMemberCard
} from '@app/hooks';
import { IClassName, IOrganizationTeamList, OT_Member } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Card, InputField, Text, VerticalSeparator } from 'lib/components';
import { TaskTimes, TodayWorkedTime } from 'lib/features';
import { useTranslations } from 'next-intl';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { TaskEstimateInfo } from './task-estimate';
import { TaskInfo } from './task-info';
import { UserInfo } from './user-info';
import { UserTeamCardMenu } from './user-team-card-menu';
import React from 'react';
import UserTeamActivity from './user-team-card-activity';
import { CollapseUpIcon, ExpandIcon } from '@components/ui/svgs/expand';
import { activityTypeState } from '@app/stores/activity-type';
import { SixSquareGridIcon } from 'assets/svg';

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
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(memberInfo.memberUser);

	const seconds = useRecoilValue(timerSecondsState);
	const setActivityFilter = useSetRecoilState(activityTypeState);
	const { activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);
	const [showActivity, setShowActivity] = React.useState<boolean>(false);
	const { activeTeamManagers } = useOrganizationTeams();
	const { user } = useAuthenticateUser();

	const isManagerConnectedUser = activeTeamManagers.findIndex((member) => member.employee?.user?.id == user?.id);

	const showActivityFilter = (type: 'DATE' | 'TICKET', member: OT_Member | null) => {
		setShowActivity((prev) => !prev);
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

	return (
		<div
			className={clsxm(!active && 'border-2 border-transparent')}
			draggable={draggable}
			onDragStart={onDragStart}
			onDragEnter={onDragEnter}
			onDragEnd={onDragEnd}
			onDragOver={onDragOver}
		>
			<Card
				shadow="bigger"
				className={clsxm(
					'sm:block hidden dark:bg-[#1E2025] min-h-[7rem] !py-4',
					active
						? ['border-primary-light border-[0.1875rem]']
						: ['dark:border border border-transparent dark:border-[#FFFFFF14]'],

					className
				)}
			>
				<div className="flex m-0 relative items-center">
					<div className="absolute left-0 cursor-pointer">
						<SixSquareGridIcon className="w-2  text-[#CCCCCC] dark:text-[#4F5662]" />
					</div>

					{/* Show user name, email and image */}
					<UserInfo memberInfo={memberInfo} className="2xl:w-[20.625rem] w-1/4" publicTeam={publicTeam} />
					<VerticalSeparator />

					{/* Task information */}
					<div className="flex justify-between items-center flex-1 min-w-[40%]">
						<TaskInfo
							edition={taskEdition}
							memberInfo={memberInfo}
							className="flex-1 lg:px-4 px-2 overflow-y-hidden"
							publicTeam={publicTeam}
						/>
						{isManagerConnectedUser != 1 ? (
							<p
								className="flex cursor-pointer w-8 h-8 border dark:border-gray-800 rounded justify-center items-center text-center"
								onClick={() => showActivityFilter('TICKET', memberInfo.member ?? null)}
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
								className="flex items-center w-8 h-8 border dark:border-gray-800 rounded  justify-center cursor-pointer text-center"
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
					<TaskInfo edition={taskEdition} memberInfo={memberInfo} className="px-4" publicTeam={publicTeam} />
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
