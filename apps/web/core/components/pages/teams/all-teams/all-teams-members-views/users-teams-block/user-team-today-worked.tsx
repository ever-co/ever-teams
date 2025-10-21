import { secondsToTime } from '@/core/lib/helpers/index';
import { useTaskStatistics, useTeamMemberCard } from '@/core/hooks';
import { activeTaskStatisticsState, timerSecondsState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';

export function BlockCardMemberTodayWorked({ member }: { member: any }) {
	const t = useTranslations();
	const memberInfo = useTeamMemberCard(member);

	const seconds = useAtomValue(timerSecondsState);
	const statActiveTask = useAtomValue(activeTaskStatisticsState);
	const activeTaskTotalStat = statActiveTask.total;
	const { addSeconds } = useTaskStatistics(seconds);

	const { hours: h, minutes: m } = secondsToTime(
		((member?.totalTodayTasks &&
			member?.totalTodayTasks.reduce(
				(previousValue: number, currentValue: TTaskStatistics) => previousValue + (currentValue.duration || 0),
				0
			)) ||
			activeTaskTotalStat?.duration ||
			0) + addSeconds
	);

	return (
		<div className={clsxm('flex flex-col justify-center items-center mr-4 space-x-2 font-normal')}>
			<span className="text-xs text-center text-gray-500 capitalize">{t('common.TOTAL_WORKED_TODAY')}</span>
			<Text className="text-sm">{memberInfo.isAuthUser ? `${h}h : ${m}m` : `0h : 0m`}</Text>
		</div>
	);
}
