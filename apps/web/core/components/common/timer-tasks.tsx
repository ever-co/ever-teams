import StatusDropdown from '@/core/components/tasks/status-dropdown';
import TaskInput from '@/core/components/tasks/task-list';
import TimerCard from '@/core/components/timer/timer-card';
import { EstimateTime } from '@/core/components/timer/estimate-time';

export function TimerTasksSection() {
	return (
		<div className="mt-[120px] flex h-[130px] w-full items-center rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="ml-4 flex w-full flex-col gap-y-4">
				<div className="w-full">
					<TaskInput />
				</div>
				<div className="ml-5 flex">
					<EstimateTime />
					<StatusDropdown />
				</div>
			</div>
			<div className="ml-12 mr-7 flex w-1/2 items-center justify-center gap-x-7">
				<TimerCard />
			</div>
		</div>
	);
}
