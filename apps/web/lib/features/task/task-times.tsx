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
} & IClassName;

export function TaskTimes({
	className,
	task,
	isAuthUser,
	activeAuthTask,
	memberInfo,
}: Props) {
	// Get current timer seconds
	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskDailyStat, activeTaskTotalStat, getTaskStat, addSeconds } =
		useTaskStatistics(seconds);

	// For public page
	const { teams } = useOrganizationTeams();
	const currentMember = teams[0].members.find(
		(member) => member.id === memberInfo?.member?.id
	);

	/**
	 * If showing the the current auth auth then show live update
	 */
	if (isAuthUser && activeAuthTask) {
		const { h, m } = secondsToTime(
			(activeTaskTotalStat?.duration || 0) + addSeconds
		);
		const { h: dh, m: dm } = secondsToTime(
			(activeTaskDailyStat?.duration || 0) + addSeconds
		);

		return (
			<div className={clsxm(className)}>
				<TimeInfo daily={{ h: dh, m: dm }} total={{ h, m }} />
			</div>
		);
	}

	/** Other member team status */
	const { taskDailyStat, taskTotalStat } = getTaskStat(task);
	const { h, m } = secondsToTime(
		taskTotalStat?.duration ||
			(currentMember?.totalTodayTasks &&
				currentMember?.totalTodayTasks?.length &&
				currentMember?.totalTodayTasks[0]?.duration) ||
			0
	);
	const { h: dh, m: dm } = secondsToTime(
		taskDailyStat?.duration ||
			(currentMember?.totalWorkedTasks &&
				currentMember?.totalWorkedTasks.length &&
				currentMember?.totalWorkedTasks[0]?.duration) ||
			0
	);

	return (
		<div className={clsxm(className)}>
			<TimeInfo daily={{ h: dh, m: dm }} total={{ h, m }} />
		</div>
	);
}

function TimeInfo({
	daily,
	total,
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
}) {
	const { trans } = useTranslation();
	return (
		<>
			<div className="flex space-x-2 items-center mb-2 font-normal">
				<span className="text-gray-500">{trans.common.TODAY}:</span>
				<Text>
					{daily.h}h : {daily.m}m
				</Text>
			</div>
			<div className="flex space-x-2 items-center text-sm font-normal">
				<span className="text-gray-500">{trans.common.TOTAL}:</span>
				<Text>
					{total.h}h : {total.m}m
				</Text>
			</div>
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
	const { teams } = useOrganizationTeams();

	// For public page
	const currentMember = teams[0].members.find(
		(member) => member.id === memberInfo?.member?.id
	);
	const { h, m } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks[0]?.duration) ||
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
