import { secondsToTime } from '@app/helpers';
import { useCollaborative, useTMCardTaskEdit, useTaskStatistics, useTeamMemberCard } from '@app/hooks';
import { IClassName, IOrganizationTeamList } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Card, HorizontalSeparator, InputField, Text, VerticalSeparator } from 'lib/components';
import { DraggerIcon } from 'lib/components/svgs';
import { TaskTimes, TodayWorkedTime } from 'lib/features';
import { useTranslation } from 'react-i18next';
import { useRecoilValue } from 'recoil';
import { TaskEstimateInfo } from './task-estimate';
import { TaskBlockInfo, TaskInfo } from './task-info';
import { UserBoxInfo } from './user-info';
import { UserTeamCardMenu } from './user-team-card-menu';

export function UserTeamCardHeader() {
	const { t } = useTranslation();
	return (
		<div className="hidden sm:flex row font-normal justify-between pb-5 pt-8 hidde dark:text-[#7B8089]">
			{/* <li className="pr-[50px]">{t('common.STATUS')}</li> */}
			<div className="2xl:w-[20.625rem] text-center">{t('common.NAME')}</div>
			<div className="w-1"></div>
			<div className="2xl:w-80 3xl:w-[32rem] w-1/5 text-center">{t('common.TASK')}</div>
			<div className="w-1"></div>
			<div className="2xl:w-48 3xl:w-[12rem] w-1/5 flex flex-col justify-center text-center">
				{t('task.taskTableHead.TASK_WORK.TITLE')}
				<br />
				{t('common.TASK')}
			</div>
			<div className="w-1"></div>
			<div className="w-1/5 text-center 2xl:w-52 3xl:w-64">{t('common.ESTIMATE')}</div>
			<div className="w-1"></div>
			<div className="2xl:w-[11.75rem] 3xl:w-[10rem] w-1/6 text-center">
				{t('task.taskTableHead.TOTAL_WORK.TITLE')}
				<br />
				{t('common.TODAY')}
			</div>
		</div>
	);
}

type IUserTeamBlock = {
	active?: boolean;
	member?: IOrganizationTeamList['members'][number];
	publicTeam?: boolean;
	members?: IOrganizationTeamList['members'];
} & IClassName;

export function UserTeamCard({ className, active, member, publicTeam = false }: IUserTeamBlock) {
	const { t } = useTranslation();
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(memberInfo.memberUser);

	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);

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
		<div className={clsxm(!active && 'border-2 border-transparent')}>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative items-center py-3  dark:bg-[#1E2025] min-h-[7rem]',
					['dark:border border-t-4 border-transparent ', ` border-green-700`],

					className
				)}
			>
				{/* flex */}
				<div className="flex items-center justify-between py-2">
					<div className="flex items-center justify-between py-2">
						<UserBoxInfo memberInfo={memberInfo} className="w-full" publicTeam={publicTeam} />
						{/* total time  */}
						<TaskTimes
							activeAuthTask={true}
							showDaily={false}
							memberInfo={memberInfo}
							task={memberInfo.memberTask}
							isAuthUser={memberInfo.isAuthUser}
							className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center"
							isBlock={true}
						/>
					</div>
					{/* more */}
					<div className="absolute right-2">{menu}</div>
				</div>

				<HorizontalSeparator />

				{/* task logo, number, title,   */}
				{/* Task information */}
				<TaskBlockInfo
					edition={taskEdition}
					memberInfo={memberInfo}
					className="2xl:w-full 3xl:w-[32rem] w-1/5 lg:px-4 px-2 py-2"
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
							className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col gap-y-[1.125rem] justify-center"
							isBlock={true}
						/>
						{/* today time */}
						{/* <TodayWorkedTime
							isAuthUser={memberInfo.isAuthUser}
							className="flex-1 lg:text-base text-xs 3xl:w-[12rem]"
							memberInfo={memberInfo}
						/> */}
					</div>
					{/* progress time */}
					<p>c.p.</p>
				</div>
			</Card>
		</div>
	);
}

export function UserTeamCardSkeleton() {
	return (
		<div
			role="status"
			className="p-4 border divide-y divide-gray-200 shadow rounded-xl animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-14 h-14 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div>
						<div className="w-32 h-3 mb-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
					</div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-24"></div>
			</div>
		</div>
	);
}

export function InviteUserTeamSkeleton() {
	return (
		<div
			role="status"
			className="p-4 mt-3 border divide-y divide-gray-200 shadow rounded-xl animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-24 bg-gray-200 h-9 rounded-xl dark:bg-gray-700"></div>
				</div>
			</div>
		</div>
	);
}
