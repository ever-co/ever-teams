import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { RawStatusDropdown } from '@/core/components/tasks/status-dropdown';

import { useTaskStatistics } from '@/core/hooks/tasks/use-task-statistics';
import { activeTaskStatisticsState, activeTeamTaskState, timerSecondsState } from '@/core/stores';
import { Play as PlayIcon } from '@/core/components/icons';
import { useRef } from 'react';
import { clsxm } from '@/core/lib/utils';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';

interface ITaskDetailCard {
	now?: boolean;
	task: TTask | null;
	current: string;
}
const UnAssignedTask = ({ now = false, task }: ITaskDetailCard) => {
	const isNow = now === true;
	const estimationPourtcent = useRef(0);
	const t = useTranslations();
	const timerReconds = useAtomValue(timerSecondsState);

	let taskStat: TTaskStatistic | null | undefined = null;

	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const statActiveTask = useAtomValue(activeTaskStatisticsState);
	const activeTaskTotalStat = statActiveTask.total;
	const { getTaskStat, activeTaskEstimation } = useTaskStatistics(timerReconds);

	if (activeTeamTask?.id === task?.id) {
		estimationPourtcent.current = activeTaskEstimation;
		taskStat = activeTaskTotalStat;
	} else {
		const { taskTotalStat } = getTaskStat(task);
		taskStat = taskTotalStat;
		estimationPourtcent.current = Math.min(
			Math.floor(((taskTotalStat?.duration || 0) * 100) / (task?.estimate || 0)),
			100
		);
	}

	const { minutes: m, hours: h } = secondsToTime((task && task.estimate) || 0);
	secondsToTime((taskStat && taskStat.duration) || 0);
	return (
		<div
			className={clsxm(
				'relative w-full my-3 justify-between rounded-xl bg-card px-6 py-2.5 font-semibold text-foreground',
				'hairline-ring shadow-sm shadow-black/6.5 transition-colors',
				isNow && 'ring-primary/40',
				!isNow && 'ring-border hover:ring-primary/30'
			)}
		>
			<div className="flex justify-between items-center">
				<div
					className={clsxm(
						'text-sm text-foreground w-[413px]',
						isNow && 'font-semibold',
						!isNow && 'font-medium'
					)}
				>
					{`#${task && task.taskNumber} `} {task && task.title}
				</div>
				<div className="h-[35px] hairline-l border-border flex justify-center items-center"></div>
				<div className="w-[236px] text-center text-xs text-muted-foreground flex flex-col justify-center items-center">
					<div className="">{t('task.ASSIGNED_BY')}</div>
					<div className="text-sm text-foreground flex-2">{t('task.NO_ONE_FOR_TASK')}</div>
				</div>
				<div className="h-[35px] hairline-l border-border flex justify-center items-center"></div>

				<div className="w-[245px]  flex justify-center items-center">
					<div>
						<div className="text-center text-xs text-muted-foreground py-1 font-medium flex items-center justify-center">
							<div> {t('common.TOTAL_TIME')} </div>
						</div>

						<div className="text-center text-sm text-foreground tabular-nums py-1 font-semibold flex items-center justify-center">
							<div>
								{h}h:{m}m
							</div>
						</div>
					</div>
					<div className="h-[30px] w-[30px] ml-9">
						<PlayIcon></PlayIcon>
					</div>
				</div>
				<div className="h-[35px] hairline-l border-border flex justify-center items-center"></div>

				<div className="text-center text-sm text-muted-foreground py-1 flex flex-col items-center justify-center">
					<RawStatusDropdown task={task} />
				</div>

				<div className="w-[14px]">{/* <DropdownUser /> */}</div>
			</div>
		</div>
	);
};

export default UnAssignedTask;
