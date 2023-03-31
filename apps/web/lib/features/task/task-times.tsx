import { secondsToTime } from '@app/helpers';
import {
	I_TeamMemberCardHook,
	useLiveTimerStatus,
	useOrganizationTeams,
	useTaskStatistics,
} from '@app/hooks';
import { IClassName, ITeamTask, Nullable } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useRecoilValue } from 'recoil';

type Props = {
	task: Nullable<ITeamTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	memberInfo?: I_TeamMemberCardHook;
	showDaily?: boolean;
	showTotal?: boolean;
} & IClassName;

export function TaskTimes({
	className,
	task,
	isAuthUser,
	activeAuthTask,
	memberInfo,
	showDaily = true,
	showTotal = true,
}: Props) {
	// For public page
	const { activeTeam } = useOrganizationTeams();
	const currentMember = activeTeam?.members.find(
		(member) => member.id === memberInfo?.member?.id
	);

	const { h, m } = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t) => t.id === task?.id)
				.reduce(
					(previousValue, currentValue) =>
						previousValue + currentValue.duration,
					0
				)) ||
			0
	);
	const { h: dh, m: dm } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks.length &&
			currentMember?.totalTodayTasks
				.filter((t) => t.id === task?.id)
				.reduce(
					(previousValue, currentValue) =>
						previousValue + currentValue.duration,
					0
				)) ||
			0
	);

	return (
		<div className={clsxm(className)}>
			<TimeInfo
				showDaily={showDaily}
				showTotal={showTotal}
				daily={{ h: dh, m: dm }}
				total={{ h, m }}
			/>
		</div>
	);
}

function TimeInfo({
	daily,
	total,
	showDaily = true,
	showTotal = true,
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
	showDaily?: boolean;
	showTotal?: boolean;
}) {
	const { trans } = useTranslation();
	return (
		<>
			{showDaily && (
				<div className="flex space-x-2 items-center mb-2 font-normal">
					<span className="text-gray-500 lg:text-sm text-xs">
						{trans.common.TODAY}:
					</span>
					<Text className="lg:text-sm text-xs">
						{daily.h}h : {daily.m}m
					</Text>
				</div>
			)}

			{showTotal && (
				<div
					className={clsxm(
						'flex space-x-2 items-center font-normal',
						showDaily && ['text-sm']
					)}
				>
					<span className="text-gray-500 lg:text-sm text-xs">
						{trans.common.TOTAL}:
					</span>
					<Text className="lg:text-sm text-xs">
						{total.h}h : {total.m}m
					</Text>
				</div>
			)}
		</>
	);
}

export function TodayWorkedTime({
	className,
	isAuthUser,
	memberInfo,
}: Omit<Props, 'task' | 'activeAuthTask'>) {
	// Get current timer seconds
	const { time } = useLiveTimerStatus();
	const { activeTeam } = useOrganizationTeams();

	const currentMember = activeTeam?.members.find(
		(member) => member.id === memberInfo?.member?.id
	);
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
			{isAuthUser ? (
				<Text>
					{time.h}h : {time.m}m
				</Text>
			) : (
				<Text>
					{h ? h : '00'}h : {m ? m : '00'} m
				</Text>
			)}
		</div>
	);
}
