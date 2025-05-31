import React from 'react';
import { secondsToTime } from '@/core/lib/helpers/index';
import { useCollaborative, useTMCardTaskEdit, useTaskStatistics, useTeamMemberCard, useTimer } from '@/core/hooks';
import { timerSecondsState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { TaskBlockInfo } from './task-info';
import { UserBoxInfo } from './user-info';
import { UserTeamCardMenu } from '../user-team-card/user-team-card-menu';
import { TaskEstimateInfo } from '../user-team-card/task-estimate';
import { TaskTimes } from '@/core/components/tasks/task-times';
import { getTimerStatusValue } from '@/core/components/timer/timer-status';
import { InputField } from '@/core/components/duplicated-components/_input';
import { EverCard } from '@/core/components/common/ever-card';
import { HorizontalSeparator } from '@/core/components/duplicated-components/separator';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { ITasksStatistics } from '@/core/types/interfaces/task/task';

type IUserTeamBlock = {
	active?: boolean;
	member?: any;
	publicTeam?: boolean;
	members?: IOrganizationTeam['members'];
} & IClassName;

const cardColorType = {
	running: ' border-green-300',
	idle: ' border-[#F5BEBE]',
	online: ' border-green-300',
	pause: ' border-[#EFCF9E]',
	suspended: ' border-[#DCD6D6]'
};

export function UserTeamBlock({ className, active, member, publicTeam = false }: IUserTeamBlock) {
	const t = useTranslations();
	const memberInfo = useTeamMemberCard(member);

	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(memberInfo.memberUser);

	const seconds = useAtomValue(timerSecondsState);
	const { activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);
	const { timerStatus } = useTimer();

	const timerStatusValue: ETimerStatus = React.useMemo(() => {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	}, [timerStatus, member, publicTeam]);

	const { h, m } = secondsToTime(
		((member?.totalTodayTasks &&
			member?.totalTodayTasks.reduce(
				(previousValue: number, currentValue: ITasksStatistics) => previousValue + (currentValue.duration || 0),
				0
			)) ||
			activeTaskTotalStat?.duration ||
			0) + addSeconds
	);

	const totalWork = (
		<div className={clsxm('flex space-x-2 items-center justify-center  font-normal flex-col mr-4')}>
			<span className="text-xs text-center text-gray-500 capitalize">{t('common.TOTAL_WORKED_TODAY')}</span>
			<Text className="text-sm">{memberInfo.isAuthUser ? `${h}h : ${m}m` : `0h : 0m`}</Text>
		</div>
	);

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
			<EverCard
				shadow="bigger"
				className={clsxm(
					'relative items-center py-3 !px-4 dark:bg-[#1E2025] min-h-[7rem]',
					['dark:border border-t-[6px] dark:border-t-[6px]', cardColorType[timerStatusValue]],
					className
				)}
			>
				{/* flex */}
				<div className="flex items-center justify-between w-full py-2">
					<UserBoxInfo memberInfo={memberInfo} className="w-3/5" publicTeam={publicTeam} />
					{/* total time  */}
					<div className="flex items-center justify-end w-2/5 gap-1">
						{totalWork}
						<div className="w-2 right-2">{menu}</div>
					</div>
				</div>

				<HorizontalSeparator />

				{/* Task information */}

				<TaskBlockInfo
					edition={taskEdition}
					memberInfo={memberInfo}
					className="w-full px-1 py-2 overflow-hidden "
					publicTeam={publicTeam}
				/>

				<HorizontalSeparator />

				{/* flex */}
				<div className="flex items-center justify-between w-full py-2">
					<div className="flex items-center justify-start">
						{/* total time */}
						<TaskTimes
							activeAuthTask={true}
							memberInfo={memberInfo}
							task={memberInfo.memberTask}
							isAuthUser={memberInfo.isAuthUser}
							className=" w-full  px-2 flex flex-col gap-y-[1.125rem] justify-center"
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
						className="w-1/5"
						radial={true}
					/>
				</div>
			</EverCard>
		</div>
	);
}
