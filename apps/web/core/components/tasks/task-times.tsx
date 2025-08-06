import { secondsToTime } from '@/core/lib/helpers/index';
import { I_TeamMemberCardHook, useOrganizationTeams } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { Nullable } from '@/core/types/generics/utils';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Tooltip } from '../duplicated-components/tooltip';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { ITasksStatistics } from '@/core/types/interfaces/task/task';

type Props = {
	task: Nullable<TTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	memberInfo?: I_TeamMemberCardHook | IEmployee | any;
	showDaily?: boolean;
	showTotal?: boolean;
	isBlock?: boolean;
} & IClassName;

export function TaskTimes({ className, task, memberInfo, showDaily = true, showTotal = true, isBlock = false }: Props) {
	// For public page
	const { activeTeam } = useOrganizationTeams();
	const currentMember = useMemo(
		() => activeTeam?.members?.find((member) => member.id === memberInfo?.member?.id || memberInfo?.id),
		[activeTeam?.members, memberInfo?.id, memberInfo?.member?.id]
	);

	const { hours: h, minutes: m } = useMemo(
		() =>
			secondsToTime(
				(currentMember?.totalWorkedTasks &&
					currentMember?.totalWorkedTasks?.length &&
					currentMember?.totalWorkedTasks
						.filter((t: TTask) => t.id === task?.id)
						.reduce(
							(previousValue: number, currentValue: ITasksStatistics) =>
								previousValue + (currentValue?.duration || 0),
							0
						)) ||
					0
			),
		[currentMember?.totalWorkedTasks, task?.id]
	);

	const { hours: dh, minutes: dm } = useMemo(
		() =>
			secondsToTime(
				(currentMember?.totalTodayTasks &&
					currentMember?.totalTodayTasks.length &&
					currentMember?.totalTodayTasks
						.filter((t: TTask) => t.id === task?.id)
						.reduce(
							(previousValue: number, currentValue: ITasksStatistics) =>
								previousValue + (currentValue?.duration || 0),
							0
						)) ||
					0
			),
		[currentMember?.totalTodayTasks, task?.id]
	);

	return (
		<div className={clsxm('min-w-[100px]', className)}>
			{isBlock ? (
				<TimeBlockInfo
					showDaily={showDaily}
					showTotal={showTotal}
					currentUser={currentMember}
					task={task}
					daily={{ h: dh, m: dm }}
					total={{ h, m }}
				/>
			) : (
				<TimeInfo
					currentUser={currentMember}
					showDaily={showDaily}
					showTotal={showTotal}
					daily={{ h: dh, m: dm }}
					total={{ h, m }}
					task={task}
				/>
			)}
		</div>
	);
}

function TimeInfo({
	daily,
	total,
	showDaily = true,
	showTotal = true,
	currentUser,
	task
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
	showDaily?: boolean;
	showTotal?: boolean;
	currentUser: TOrganizationTeamEmployee | undefined;
	task: Nullable<TTask>;
}) {
	const t = useTranslations();

	return (
		<>
			{showDaily && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee?.fullName} ${t('task.WORKED_TODAY_ON_TASK_TOOLTIP')} ${daily.h}h : ${
						daily.m
					}m`}
				>
					<div className="flex gap-x-4 items-center text-sm font-normal">
						<span className="text-[#7B8089] text-center capitalize">{t('common.TODAY')}</span>
						<Text className="text-[13px] text-nowrap whitespace-nowrap">
							{daily.h}h : {daily.m}m
						</Text>
					</div>
				</Tooltip>
			)}

			{showTotal && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee?.fullName} ${t('task.WORKED_TOTAL_ON_TASK_TOOLTIP')} ${total.h}h : ${
						total.m
					}m`}
				>
					<div
						className={clsxm(
							'flex gap-x-4 items-center font-normal text-sm'
							// showDaily && ['text-sm']
						)}
					>
						<span className="text-[#7B8089] text-center capitalize">{t('common.TOTAL')}</span>
						<Text className="whitespace-nowrap text-nowrap">
							{total.h}h : {total.m}m
						</Text>
					</div>
				</Tooltip>
			)}
		</>
	);
}

function TimeBlockInfo({
	daily,
	total,
	showDaily = true,
	showTotal = true,
	currentUser,
	task
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
	showDaily?: boolean;
	showTotal?: boolean;
	currentUser: TOrganizationTeamEmployee | undefined;
	task: Nullable<TTask>;
}) {
	const t = useTranslations();
	return (
		<div className="flex gap-1">
			{showDaily && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee?.fullName} ${t('task.WORKED_TODAY_ON_TASK_TOOLTIP')} ${daily.h}h : ${
						daily.m
					}m`}
				>
					<div className="flex flex-col items-center text-base font-normal">
						<span className="text-[#7B8089] text-center text-xs capitalize">
							{t('common.WORKED_ON_TASK')} {t('common.TODAY')}
						</span>
						<Text className="text-lg">
							{daily.h}h : {daily.m}m
						</Text>
					</div>
				</Tooltip>
			)}

			{showTotal && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee?.fullName} ${t('task.WORKED_TOTAL_ON_TASK_TOOLTIP')} ${total.h}h : ${
						total.m
					}m`}
				>
					<div
						className={clsxm(
							'font-normal text-base flex flex-col items-center '
							// showDaily && ['text-sm']
						)}
					>
						<span className="text-[#7B8089] text-center text-xs capitalize">
							{t('common.WORKED_ON_TASK')} {t('common.TOTAL')}
						</span>
						<Text className="text-lg">
							{total.h}h : {total.m}m
						</Text>
					</div>
				</Tooltip>
			)}
		</div>
	);
}

export function TodayWorkedTime({ className, memberInfo }: Omit<Props, 'task' | 'activeAuthTask'>) {
	// Get current timer seconds
	const { activeTeam } = useOrganizationTeams();

	const t = useTranslations();

	const currentMember = activeTeam?.members?.find((member) => member.id === memberInfo?.member?.id);
	const { hours: h, minutes: m } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks.reduce(
				(previousValue: number, currentValue: ITasksStatistics) =>
					previousValue + (currentValue?.duration || 0),
				0
			)) ||
			0
	);

	return (
		<div className={clsxm('font-normal text-center', className)}>
			<Tooltip
				label={`${currentMember?.employee?.fullName} ${t(
					'task.WORKED_TODAY_ON_ALL_TOOLTIP'
				)} ${activeTeam?.name} ${t('task.TASKS_FOR_TOOLTIP')} ${h}h : ${m}m`}
			>
				<Text>
					{h ? h : '0'}h : {m ? m : '0'}m
				</Text>
			</Tooltip>
		</div>
	);
}
