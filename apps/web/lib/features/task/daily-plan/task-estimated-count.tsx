import { secondsToTime } from '@app/helpers';
import { IDailyPlan } from '@app/interfaces';
import { VerticalSeparator } from 'lib/components';

interface ITaskEstimatedCount {
	outstandingPlans: any[];
}
export function TaskEstimatedCount({ outstandingPlans }: ITaskEstimatedCount) {
	const element = outstandingPlans?.map((plan: IDailyPlan) => plan.tasks?.map((task) => task));
	const { timesEstimated, totalTasks } = estimatedTotalTime(element || []);
	const { h: hour, m: minute } = secondsToTime(timesEstimated || 0);
	return (
		<div className="flex space-x-10">
			<div className="flex space-x-2">
				<span className="text-slate-600">Estimated:</span>
				<span className="text-slate-900 font-semibold text-[12px]">
					{hour}h{minute}m
				</span>
			</div>
			<VerticalSeparator className="border-slate-400" />
			<div className="flex space-x-2">
				<span className="text-slate-600">Total tasks:</span>
				<span className="text-slate-900 font-semibold text-[12px]">{totalTasks}</span>
			</div>
		</div>
	);
}

export function estimatedTotalTime(data: any) {
	// Flatten the data and reduce to calculate the sum of estimates without duplicates
	const uniqueTasks = data.flat().reduce((acc: any, task: any) => {
		if (!acc[task.id]) {
			acc[task.id] = task.estimate;
		}
		return acc;
	}, {});

	// Calculate the total of estimates
	const timesEstimated = Object.values(uniqueTasks)?.reduce((total: number, estimate: any) => total + estimate, 0);
	// Calculate the total of tasks
	const totalTasks = Object.values(uniqueTasks)?.length;

	return { timesEstimated, totalTasks };
}
