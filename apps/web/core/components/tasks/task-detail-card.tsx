import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { useTaskStatistics } from '@/core/hooks/tasks/use-task-statistics';
import { ITeamTask } from '@/core/types/interfaces/ITask';
import { ITasksTimesheet } from '@/core/types/interfaces/ITimer';
import { timerSecondsState } from '@/core/stores';
import { RawStatusDropdown } from '@/core/components/tasks/status-dropdown';
import { ProgressBar } from '@/core/components/common/progress-bar';
import Separator from '@/core/components/common/separator';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { useAtomValue } from 'jotai';

interface ITaskDetailCard {
	now?: boolean;
	task: ITeamTask | null;
	current?: string;
}
const TaskDetailCard = ({ now = false, task }: ITaskDetailCard) => {
	const estimationPourtcent = useRef(0);
	const timerReconds = useAtomValue(timerSecondsState);
	const t = useTranslations();

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
	const { m: tm, h: th } = secondsToTime((taskStat && taskStat.duration) || 0);

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
					className={`text-primary dark:text-[#FFFFFF] text-[14px] ${
						now == true ? 'font-normal' : 'font-light'
					} w-[413px]`}
				>
					{`#${task && task.taskNumber} `} {task && task.title}
				</div>
				<Separator />
				<div className="w-[122px]  text-center text-primary dark:text-[#FFFFFF] flex justify-center items-center">
					{th}h {tm}m
				</div>
				<Separator />

				<div className="w-[245px]  flex justify-center items-center">
					<div>
						<div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex items-center justify-center">
							<div> {t('common.ESTIMATE')}</div>
						</div>
						<div className="mb-2">
							<ProgressBar width={200} progress={`${estimationPourtcent.current}%`} />
						</div>
						<div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex items-center justify-center">
							<div>
								{h}h {m}m
							</div>
						</div>
					</div>
				</div>
				<Separator />

				<div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex flex-col items-center justify-center">
					<RawStatusDropdown task={task} />
				</div>

				<Separator />
				<div className="w-[14px]  flex items-center">
					{/* <DropdownUser
						setEdit={() => {
							//
						}}
						setEstimateEdit={() => {
							//
						}}
					/> */}
				</div>
			</div>
		</div>
	);
};
export default TaskDetailCard;
