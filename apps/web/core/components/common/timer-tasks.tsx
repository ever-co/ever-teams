import StatusDropdown from '@/core/components/tasks/status-dropdown';
import TaskInput from '@/core/components/tasks/task-list';
import TimerCard from '@/core/components/timer/timer-card';
import { EstimateTime } from '@/core/components/timer/estimate-time';

export function TimerTasksSection() {
	return (
		<div className="bg-[#FFFF] dark:bg-[#202023] mt-[120px] rounded-[20px] w-full h-[130px] flex items-center">
			<div className="ml-[16px] flex flex-col space-y-[15px] w-full">
				<div className="w-full">
					<TaskInput />
				</div>
				<div className="flex ml-[20px]">
					<EstimateTime />
					<StatusDropdown />
				</div>
			</div>
			<div className="flex justify-center items-center space-x-[27px] mr-[27px] w-1/2 ml-[48px]">
				<TimerCard />
			</div>
		</div>
	);
}
