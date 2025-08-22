import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { RawStatusDropdown } from '@/core/components/tasks/status-dropdown';

import { useTaskStatistics } from '@/core/hooks/tasks/use-task-statistics';
import { activeTaskStatisticsState, activeTeamTaskState, timerSecondsState } from '@/core/stores';
import { PlayIcon } from '@heroicons/react/20/solid';
import { useRef } from 'react';
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
			className={`w-full rounded-[10px] drop-shadow-[0px_3px_15px_#3E1DAD1A] border relative  ${
				now === true
					? '  border-primary dark:border-gray-100'
					: ' hover:border hover:border-primary dark:border-[#202023]'
			} bg-[#FFFFFF] my-[15px] dark:bg-[#202023] justify-between dark:hover:border-gray-100 font-bold px-[24px] dark:text-[#FFFFFF] py-[10px]`}
		>
			<div className="flex justify-between items-center">
				<div
					className={`text-black dark:text-[#FFFFFF] text-[14px] ${
						now == true ? 'font-semibold' : 'font-medium'
					} w-[413px]`}
				>
					{`#${task && task.taskNumber} `} {task && task.title}
				</div>
				<div className="h-[35px] text-[#D7E1EB] border-l border-[#E8EBF8] dark:border-[#27272A] flex justify-center items-center"></div>
				<div className="w-[236px]  text-center text-[#C1BFC9] dark:text-[#FFFFFF] flex flex-col justify-center items-center">
					<div className="">{t('task.ASSIGNED_BY')}</div>
					<div className="text-black flex-2">{t('task.NO_ONE_FOR_TASK')}</div>
				</div>
				<div className="h-[35px] text-[#D7E1EB] border-l border-[#E8EBF8] dark:border-[#27272A] flex justify-center items-center"></div>

				<div className="w-[245px]  flex justify-center items-center">
					<div>
						<div className="text-center text-[14px] text-[#C1BFC9]  py-1 font-semibold flex items-center justify-center">
							<div> {t('common.TOTAL_TIME')} </div>
						</div>

						<div className="text-center text-[14px] text-black dark:text-[#FFFFFF]  py-1 font-semibold flex items-center justify-center">
							<div>
								{h}h:{m}m
							</div>
						</div>
					</div>
					<div className="h-[30px] w-[30px] ml-9">
						<PlayIcon></PlayIcon>
					</div>
				</div>
				<div className="h-[35px] text-[#D7E1EB] border-l border-[#E8EBF8] dark:border-[#27272A] flex justify-center items-center"></div>

				<div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex flex-col items-center justify-center">
					<RawStatusDropdown task={task} />
				</div>

				<div className="w-[14px]">{/* <DropdownUser /> */}</div>
			</div>
		</div>
	);
};

export default UnAssignedTask;
