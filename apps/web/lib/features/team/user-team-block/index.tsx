import React from 'react';
import { secondsToTime } from '@app/helpers';
import {
	useCollaborative,
	useTMCardTaskEdit,
	useTaskStatistics,
	useOrganizationTeams,
	useTeamMemberCard,
	useTimer,
	useAuthenticateUser,
	useModal
} from '@app/hooks';
import { IClassName, IOrganizationTeamList, ITimerStatusEnum } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Card, HorizontalSeparator, InputField, Text, Button } from 'lib/components';
import { TaskTimes, getTimerStatusValue } from 'lib/features';
import { useTranslation } from 'react-i18next';
import { useRecoilValue } from 'recoil';
import { TaskBlockInfo } from './task-info';
import { UserBoxInfo } from './user-info';
import { UserTeamCardMenu } from './user-team-card-menu';
import { TaskEstimateInfo } from '../user-team-card/task-estimate';
import { InviteFormModal } from '../invite/invite-form-modal';

export function UserTeamBlockHeader() {
	// const { t } = useTranslation();
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();

	console.log({ activeTeam });
	const membersStatusNumber: { running: number; online: number; pause: number; idle: number; suspended: number } = {
		running: 0,
		online: 0,
		pause: 0,
		idle: 0,
		suspended: 0
	};

	const members = activeTeam?.members ? activeTeam?.members : [];
	members?.map((item) => {
		membersStatusNumber[item.timerStatus!]++;
	});

	return (
		<>
			<div className="hidden sm:flex row font-normal pt-4 justify-between hidde dark:text-[#7B8089]">
				<div className="flex items-center w-3/4">
					<div className="w-1/6 text-center flex items-center justify-center py-4 border-b-4 border-gray-100 dark:border-dark hover:border-primary dark:hover:border-primary hover:text-primary ">
						<p>All members </p>
						<div className="bg-gray-200 p-1 px-2 flex items-center justify-center rounded mx-1">
							{members?.length}
						</div>
					</div>
					<div className="w-1/6 text-center flex items-center justify-center py-4 border-b-4 border-gray-100 dark:border-dark hover:border-primary dark:hover:border-primary hover:text-primary ">
						<p>Not working </p>
						<div className="bg-gray-200 p-1 px-2 flex items-center justify-center rounded mx-1">
							{membersStatusNumber.idle}
						</div>
					</div>
					<div className="w-1/6 text-center flex items-center justify-center py-4 border-b-4 border-gray-100 dark:border-dark hover:border-primary dark:hover:border-primary hover:text-primary ">
						<p>Working </p>
						<div className="bg-gray-200 p-1 px-2 flex items-center justify-center rounded mx-1">
							{membersStatusNumber.running}
						</div>
					</div>
					<div className="w-1/6 text-center flex items-center justify-center py-4 border-b-4 border-gray-100 dark:border-dark hover:border-primary dark:hover:border-primary hover:text-primary ">
						<p>Paused </p>
						<div className="bg-gray-200 p-1 px-2 flex items-center justify-center rounded mx-1">
							{membersStatusNumber.pause}
						</div>
					</div>
					<div className="w-1/6 text-center flex items-center justify-center py-4 border-b-4 border-gray-100 dark:border-dark hover:border-primary dark:hover:border-primary hover:text-primary ">
						<p>Online</p>
						<div className="bg-gray-200 p-1 px-2 flex items-center justify-center rounded mx-1">
							{membersStatusNumber.online}
						</div>
					</div>
				</div>
				<div className="w-1/4 flex justify-end	items-center">
					{/* <Invite /> */}
					<Button className="py-3.5 px-4 gap-3 rounded-xl outline-none" onClick={openModal}>
						Invite
					</Button>
				</div>
			</div>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
}

type IUserTeamBlock = {
	active?: boolean;
	member?: IOrganizationTeamList['members'][number];
	publicTeam?: boolean;
	members?: IOrganizationTeamList['members'];
} & IClassName;

const cardColorType = {
	running: ' border-green-700',
	idle: ' border-green-700',
	online: ' border-green-700',
	pause: ' border-yellow-700',
	suspended: ' border-red-700'
};

export function UserTeamBlock({ className, active, member, publicTeam = false }: IUserTeamBlock) {
	const { t } = useTranslation();
	const memberInfo = useTeamMemberCard(member);

	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(memberInfo.memberUser);

	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);
	const { timerStatus } = useTimer();

	const timerStatusValue: ITimerStatusEnum = React.useMemo(() => {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	}, [timerStatus, member, publicTeam]);

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
			<div className={clsxm('flex space-x-2 items-center justify-center w-32 font-normal flex-col mr-4')}>
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
		<div className={clsxm(!active && 'border-2 border-transparent')}>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative items-center py-3  dark:bg-[#1E2025] min-h-[7rem]',
					['dark:border dark:border-t-5 border-t-5 border-transparent ', cardColorType[timerStatusValue]],
					className
				)}
			>
				{/* flex */}
				<div className="flex items-center justify-between py-2 w-full">
					<div className="flex items-center justify-between py-2 w-full">
						<UserBoxInfo memberInfo={memberInfo} className="w-3/4" publicTeam={publicTeam} />
						{/* total time  */}
						{totalWork}
					</div>
					{/* more */}
					<div className="absolute right-2">{menu}</div>
				</div>

				<HorizontalSeparator />

				{/* Task information */}
				<TaskBlockInfo
					edition={taskEdition}
					memberInfo={memberInfo}
					className=" w-full lg:px-4 px-2 py-2 overflow-hidden"
					publicTeam={publicTeam}
				/>
				{/* prograssion,  tags */}

				<HorizontalSeparator />

				{/* flex */}
				<div className="w-full flex justify-between items-center py-2">
					<div className="flex justify-start items-center">
						{/* total time */}
						<TaskTimes
							activeAuthTask={true}
							memberInfo={memberInfo}
							task={memberInfo.memberTask}
							isAuthUser={memberInfo.isAuthUser}
							className="2xl:w-48 3xl:w-[12rem] w-full lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center"
							isBlock={true}
						/>
						{/* today time */}
					</div>
					{/* progress time */}
					<TaskEstimateInfo
						memberInfo={memberInfo}
						edition={taskEdition}
						activeAuthTask={true}
						showTime={false}
						className="w-1/5 lg:px-3 2xl:w-52 3xl:w-64"
						radial={true}
					/>
				</div>
			</Card>
		</div>
	);
}
