import { TDailyPlan, TUser } from '@/core/types/schemas';
import { filterDailyPlansByEmployee } from './use-filter-date-range';

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
