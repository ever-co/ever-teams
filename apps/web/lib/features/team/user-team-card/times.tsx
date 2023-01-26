import { secondsToTime } from '@app/helpers';
import { I_TeamMemberCardHook, useTaskStatistics } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { timerSecondsState, timerStatusState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { useRecoilValue } from 'recoil';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
};

export function TaskTime({ className, memberInfo }: Props) {
	// Get current timer seconds
	const seconds = useRecoilValue(timerSecondsState);

	const { activeTaskDailyStat, activeTaskTotalStat, getTaskStat, addSeconds } =
		useTaskStatistics(seconds);

	/**
	 * If showing the the current auth auth then show live update
	 */
	if (memberInfo.isAuthUser) {
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
	const { taskDailyStat, taskTotalStat } = getTaskStat(memberInfo.memberTask);
	const { h, m } = secondsToTime(taskTotalStat?.duration || 0);
	const { h: dh, m: dm } = secondsToTime(taskDailyStat?.duration || 0);

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
	return (
		<>
			<div className="flex space-x-2 items-center mb-2 font-normal">
				<span className="text-gray-500">Today:</span>
				<Text>
					{daily.h}h : {daily.m}m
				</Text>
			</div>
			<div className="flex space-x-2 items-center text-sm font-normal">
				<span className="text-gray-500">Total:</span>
				<Text>
					{total.h}h : {total.m}m
				</Text>
			</div>
		</>
	);
}

export function TodayWorkedTime({ className, memberInfo }: Props) {
	// Get current timer seconds
	const seconds = useRecoilValue(timerSecondsState);

	const timerStatus = useRecoilValue(timerStatusState);
	const { h, m } = secondsToTime((timerStatus?.duration || 0) + seconds);

	return (
		<div className={clsxm('text-center font-normal', className)}>
			{memberInfo.isAuthUser ? (
				<Text>
					{h} h : {m} m
				</Text>
			) : (
				<Text>00 h : 00 m</Text>
			)}
		</div>
	);
}
