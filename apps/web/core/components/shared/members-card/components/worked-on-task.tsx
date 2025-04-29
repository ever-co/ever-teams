import { secondsToTime } from '@app/helpers/date';
import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { ITeamTask } from '@app/interfaces/ITask';
import { useTranslations } from 'next-intl';

export function WorkedOnTask({ memberTask, isAuthUser }: { memberTask: ITeamTask | null; isAuthUser: boolean }) {
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
