import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { useTaskStatistics } from '@/core/hooks/tasks/use-task-statistics';
import { ITask } from '@/core/types/interfaces/task/task';
import { useTranslations } from 'next-intl';

export function WorkedOnTask({ memberTask, isAuthUser }: { memberTask: ITask | null; isAuthUser: boolean }) {
	const { activeTaskDailyStat, activeTaskTotalStat, getTaskStat } = useTaskStatistics();
	const t = useTranslations();
	if (isAuthUser) {
		const { h, m } = secondsToTime(activeTaskTotalStat?.duration || 0);
		const { h: dh, m: dm } = secondsToTime(activeTaskDailyStat?.duration || 0);

		return (
			<div className="w-[122px]  text-center">
				{t('common.TODAY')} {dh}h:{dm}m <br />{' '}
				<span className="opacity-60">
					{t('common.TOTAL')} {h}h:{m}m
				</span>
			</div>
		);
	}
	const { taskDailyStat, taskTotalStat } = getTaskStat(memberTask);

	const { h, m } = secondsToTime(taskTotalStat?.duration || 0);
	const { h: dh, m: dm } = secondsToTime(taskDailyStat?.duration || 0);

	return (
		<div className="w-[122px]  text-center">
			{t('common.TODAY')} {dh}h:{dm}m <br />{' '}
			<span className="opacity-60">
				{t('common.TOTAL')} {h}h:{m}m
			</span>
		</div>
	);
}
