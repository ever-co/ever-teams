import { secondsToTime } from '@app/helpers/date';
import { ITeamTask } from '@app/interfaces/ITask';
import { RawStatusDropdown } from '@/core/components/shared/tasks/status-dropdown';

import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { ITasksTimesheet } from '@app/interfaces/ITimer';
import { timerSecondsState } from '@app/stores';
import { PlayIcon } from '@heroicons/react/20/solid';
import { useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';

interface ITaskDetailCard {
	now?: boolean;
	task: ITeamTask | null;
	current: string;
}
const UnAssignedTask = ({ now = false, task }: ITaskDetailCard) => {
	const estimationPourtcent = useRef(0);
	const t = useTranslations();
	const timerReconds = useAtomValue(timerSecondsState);

	let taskStat: ITasksTimesheet | null | undefined = null;

	const { getTaskStat, activeTeamTask, activeTaskEstimation, activeTaskTotalStat } = useTaskStatistics(timerReconds);

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

	const { m, h } = secondsToTime((task && task.estimate) || 0);
	secondsToTime((taskStat && taskStat.duration) || 0);
	// const { m: tm, h: th } = secondsToTime((taskStat && taskStat.duration) || 0);
	return (
		<div
			className={`w-full rounded-[10px] drop-shadow-[0px_3px_15px_#3E1DAD1A] border relative  ${
				now === true
					? '  border-primary dark:border-gray-100'
					: ' hover:border hover:border-primary dark:border-[#202023]'
			} bg-[#FFFFFF] my-[15px] dark:bg-[#202023] justify-between dark:hover:border-gray-100 font-bold px-[24px] dark:text-[#FFFFFF] py-[10px]`}
		>
			<div className="flex items-center justify-between ">
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
