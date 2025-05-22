import { IDailyPlan, ITask } from '@/core/types/interfaces/to-review';
import { formatDayPlanDate } from './date-and-time';

export const planBadgeContent = (
	plans: IDailyPlan[],
	taskId: ITask['id'],
	tab?: 'default' | 'unassign' | 'dailyplan'
): string | null => {
	// Search a plan that contains a given task
	const plan = plans.find((plan) => plan.tasks?.some((task) => task.id === taskId));

	// If at least one plan have this task
	if (plan) {
		// Check if the task appears in other plans
		const otherPlansWithTask = plans.filter(
			(pl) => pl.id !== plan.id && pl.tasks?.some((tsk) => tsk.id === taskId)
		);

		// If the task exists in other plans, then its planned many days
		if (otherPlansWithTask.length > 0 || tab === 'unassign') {
			return 'Planned';
		} else {
			return `${formatDayPlanDate(plan.date, 'DD MMM YYYY')}`;
			// return `Planned ${formatDayPlanDate(plan.date, 'DD MMM YYYY')}`;
		}
		// The task does not exist in any plan
	} else {
		return null;
	}
};

export const planBadgeContPast = (dailyPlan: IDailyPlan[], taskId: ITask['id']): string | null => {
	const today = new Date().toISOString().split('T')[0];
	const dailyPlanDataPast = dailyPlan.filter((plan) => new Date(plan.date) < new Date(today));
	const allTasks = dailyPlanDataPast.flatMap((plan) => plan.tasks);
	const taskCount: { [key: string]: number } = allTasks?.reduce(
		(acc, task) => {
			if (task && task.id) {
				acc[task.id] = (acc[task.id] || 0) + 1;
			}
			return acc;
		},
		{} as { [key: string]: number }
	);

	const dailyPlanPast = allTasks?.filter((task) => task && taskCount[task.id] === 1);
	const filterDailyPlan = dailyPlanPast.filter((plan) => plan?.id === taskId);
	if (filterDailyPlan.length > 0) {
		return 'Planned';
	} else {
		return null;
	}
};
