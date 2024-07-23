import { IDailyPlan, ITeamTask } from '@app/interfaces';
import { formatDayPlanDate } from './date';

export const planBadgeContent = (
	plans: IDailyPlan[],
	taskId: ITeamTask['id'],
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
