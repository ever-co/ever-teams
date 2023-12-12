import { secondsToTime } from '@app/helpers';
import { I_TeamMemberCardHook, useOrganizationTeams } from '@app/hooks';
import { IClassName, ITeamTask, Nullable, OT_Member } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Text, Tooltip } from 'lib/components';
import { useTranslation } from 'react-i18next';

type Props = {
	task: Nullable<ITeamTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	memberInfo?: I_TeamMemberCardHook | OT_Member | any;
	showDaily?: boolean;
	showTotal?: boolean;
	isBlock?: boolean;
} & IClassName;

export function TaskTimes({ className, task, memberInfo, showDaily = true, showTotal = true, isBlock = false }: Props) {
	// For public page
	const { activeTeam } = useOrganizationTeams();
	const currentMember = activeTeam?.members.find((member) => member.id === memberInfo?.member?.id || memberInfo?.id);

	const { h, m } = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t) => t.id === task?.id)
				.reduce((previousValue, currentValue) => previousValue + currentValue.duration, 0)) ||
			0
	);
	const { h: dh, m: dm } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks.length &&
			currentMember?.totalTodayTasks
				.filter((t) => t.id === task?.id)
				.reduce((previousValue, currentValue) => previousValue + currentValue.duration, 0)) ||
			0
	);

	return (
		<div className={clsxm(className)}>
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
	currentUser: OT_Member | undefined;
	task: Nullable<ITeamTask>;
}) {
	const { t } = useTranslation();

	return (
		<>
			{showDaily && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee.fullName} ${t('task.WORKED_TODAY_ON_TASK_TOOLTIP')} ${daily.h}h : ${
						daily.m
					}m`}
				>
					<div className="flex items-center space-x-2 text-base font-normal">
						<span className="text-[#7B8089] text-center">{t('common.TODAY')}:</span>
						<Text>
							{daily.h}h : {daily.m}m
						</Text>
					</div>
				</Tooltip>
			)}

			{showTotal && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee.fullName} ${t('task.WORKED_TOTAL_ON_TASK_TOOLTIP')} ${total.h}h : ${
						total.m
					}m`}
				>
					<div
						className={clsxm(
							'flex space-x-4 items-center font-normal text-sm'
							// showDaily && ['text-sm']
						)}
					>
						<span className="text-[#7B8089] text-center">{t('common.TOTAL')}:</span>
						<Text>
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
	currentUser: OT_Member | undefined;
	task: Nullable<ITeamTask>;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex gap-1">
			{showDaily && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee.fullName} ${t('task.WORKED_TODAY_ON_TASK_TOOLTIP')} ${daily.h}h : ${
						daily.m
					}m`}
				>
					<div className=" text-base font-normal flex flex-col items-center ">
						<span className="text-[#7B8089] text-center text-xs">
							{t('common.WORKED_ON_TASK')} {t('common.TODAY')}:
						</span>
						<Text className="text-lg font-semibold">
							{daily.h}h : {daily.m}m
						</Text>
					</div>
				</Tooltip>
			)}

			{showTotal && (
				<Tooltip
					enabled={task ? true : false}
					label={`${currentUser?.employee.fullName} ${t('task.WORKED_TOTAL_ON_TASK_TOOLTIP')} ${total.h}h : ${
						total.m
					}m`}
				>
					<div
						className={clsxm(
							'font-normal text-base flex flex-col items-center '
							// showDaily && ['text-sm']
						)}
					>
						<span className="text-[#7B8089] text-center text-xs">
							{t('common.WORKED_ON_TASK')} {t('common.TOTAL')}:
						</span>
						<Text className="text-lg font-semibold">
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

	const { t } = useTranslation();

	const currentMember = activeTeam?.members.find((member) => member.id === memberInfo?.member?.id);
	const { h, m } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks.reduce(
				(previousValue, currentValue) => previousValue + currentValue.duration,
				0
			)) ||
			0
	);

	return (
		<div className={clsxm('text-center font-normal', className)}>
			<Tooltip
				label={`${currentMember?.employee.fullName} ${t(
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
