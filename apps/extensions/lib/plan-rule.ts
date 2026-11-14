export interface PlanLike {
	date?: string | null;
	tasks?: ReadonlyArray<{ id: string }> | null;
}

export type PlanRefusalCode = 'DAILY_PLAN_REQUIRED' | 'TASK_NOT_PLANNED';

/**
 * The daily plan rule of a team that requires a plan to track, as the API applies it to the web's starts: a plan of
 * the day holding tasks, and the started task among them. `planDay` is the person's day, YYYY-MM-DD.
 */
export function planRefusalOf(input: {
	teamRequiresPlan: boolean;
	plans: ReadonlyArray<PlanLike>;
	taskId: string;
	planDay: string;
}): PlanRefusalCode | null {
	if (!input.teamRequiresPlan) {
		return null;
	}
	const plansOfTheDay = input.plans.filter((plan) => (plan.date ?? '').slice(0, 10) === input.planDay);
	const plansWithTasks = plansOfTheDay.filter((plan) => (plan.tasks ?? []).length > 0);
	if (plansWithTasks.length === 0) {
		return 'DAILY_PLAN_REQUIRED';
	}
	const isTaskPlanned = plansWithTasks.some((plan) => (plan.tasks ?? []).some((task) => task.id === input.taskId));
	if (!isTaskPlanned) {
		return 'TASK_NOT_PLANNED';
	}
	return null;
}
