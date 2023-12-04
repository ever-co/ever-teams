import React from 'react';
import { secondsToTime } from '@app/helpers';
import { useCollaborative, useTMCardTaskEdit, useTaskStatistics, useTeamMemberCard, useTimer } from '@app/hooks';
import { IClassName, IOrganizationTeamList, ITimerStatusEnum } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Card, HorizontalSeparator, InputField, Text } from 'lib/components';
import { TaskTimes, getTimerStatusValue } from 'lib/features';
import { useTranslation } from 'react-i18next';
import { useRecoilValue } from 'recoil';
import { TaskBlockInfo } from './task-info';
import { UserBoxInfo } from './user-info';
import { UserTeamCardMenu } from './user-team-card-menu';
import { TaskEstimateInfo } from '../user-team-card/task-estimate';

type IUserTeamBlock = {
	active?: boolean;
	member?: IOrganizationTeamList['members'][number];
	publicTeam?: boolean;
	members?: IOrganizationTeamList['members'];
} & IClassName;

const cardColorType = {
	running: ' border-green-300',
	idle: ' border-[#F5BEBE]',
	online: ' border-green-300',
	pause: ' border-[#EFCF9E]',
	suspended: ' border-[#DCD6D6]'
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
					['dark:border border-t-[6px] ', cardColorType[timerStatusValue]],
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
