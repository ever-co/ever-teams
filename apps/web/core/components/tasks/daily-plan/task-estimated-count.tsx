import { secondsToTime } from '@/core/lib/helpers/index';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { useTranslations } from 'next-intl';
import { VerticalSeparator } from '../../duplicated-components/separator';
import { filterDailyPlansByEmployee } from '@/core/hooks/daily-plans/use-filter-date-range';

interface ITaskEstimatedCount {
	outstandingPlans: TDailyPlan[];
}
export function TaskEstimatedCount({ outstandingPlans }: ITaskEstimatedCount) {
	// Extract tasks from plans correctly - estimatedTotalTime expects array of task arrays
	const element = outstandingPlans?.map((plan: TDailyPlan) => plan.tasks || []);
	const { timesEstimated, totalTasks } = estimatedTotalTime(element || []);
	const { hours: hour, minutes: minute } = secondsToTime(timesEstimated || 0);
	const t = useTranslations();

	return (
		<div className="flex space-x-10">
			<div className="flex space-x-2">
				<span className="text-slate-600 dark:text-slate-200">{t('dailyPlan.ESTIMATED')} :</span>
				<span className="text-slate-900 dark:text-slate-200 font-semibold text-[12px]">
					{hour}h{minute}m
				</span>
			</div>
			<VerticalSeparator className="border-slate-400" />
			<div className="flex space-x-2">
				<span className="text-slate-600 dark:text-slate-200">{t('dailyPlan.TOTAL_TASK')}:</span>
				<span className="text-slate-900 dark:text-slate-200 font-semibold text-[12px]">{totalTasks}</span>
			</div>
		</div>
	);
}

export function estimatedTotalTime(data: any) {
	// Flatten the data and reduce to calculate the sum of estimates without duplicates
	const uniqueTasks = data?.flat().reduce((acc: any, task: any) => {
		if (!acc[task.id]) {
			acc[task.id] = task.estimate;
		}
		return acc;
	}, {});

	// Calculate the total of estimates
	const timesEstimated =
		uniqueTasks && Object.values(uniqueTasks)?.reduce((total: number, estimate: any) => total + estimate, 0);
	// Calculate the total of tasks
	const totalTasks = uniqueTasks && Object.values(uniqueTasks)?.length;

	return { timesEstimated, totalTasks };
}

export const getTotalTasks = (plans?: TDailyPlan[], user?: TUser, filterByEmployee = false): number => {
	if (!plans || plans.length === 0) {
		return 0;
	}

	// Filter plans by employee if flag is enabled
	const filteredPlans = filterByEmployee ? filterDailyPlansByEmployee(plans, user) : plans;

	// Count all tasks in filtered plans
	const tasksPerPlan = filteredPlans.map((plan) => plan.tasks?.length || 0);

	return tasksPerPlan.reduce((total, taskCount) => total + taskCount, 0);
};
