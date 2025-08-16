import React from 'react';
import { secondsToTime } from '@/core/lib/helpers/index';
import { useCollaborative, useTMCardTaskEdit, useTaskStatistics, useTeamMemberCard } from '@/core/hooks';
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
import { timerStatusState } from '@/core/stores';

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
	const timerStatus = useAtomValue(timerStatusState);

	const timerStatusValue: ETimerStatus = React.useMemo(() => {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	}, [timerStatus, member, publicTeam]);

	const { hours: h, minutes: m } = secondsToTime(
		((member?.totalTodayTasks &&
			member?.totalTodayTasks.reduce(
				(previousValue: number, currentValue: TTaskStatistics) => previousValue + (currentValue.duration || 0),
				0
			)) ||
			activeTaskTotalStat?.duration ||
			0) + addSeconds
	);

	const totalWork = (
		<div className={clsxm('flex flex-col justify-center items-center mr-4 space-x-2 font-normal')}>
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
					className={clsxm('mr-1 w-4 h-4 border-none accent-primary-light', 'border-2 border-primary-light')}
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
				<div className="flex justify-between items-center py-2 w-full">
					<UserBoxInfo memberInfo={memberInfo} className="w-3/5" publicTeam={publicTeam} />
					{/* total time  */}
					<div className="flex gap-1 justify-end items-center w-2/5">
						{totalWork}
						<div className="right-2 w-2">{menu}</div>
					</div>
				</div>

				<HorizontalSeparator />

				{/* Task information */}

				<TaskBlockInfo
					edition={taskEdition}
					memberInfo={memberInfo}
					className="overflow-hidden px-1 py-2 w-full"
					publicTeam={publicTeam}
				/>

				<HorizontalSeparator />

				{/* flex */}
				<div className="flex justify-between items-center py-2 w-full">
					<div className="flex justify-start items-center">
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
