export interface PlanLike {
	date?: string | null;
	tasks?: ReadonlyArray<{ id: string }> | null;
}

export type PlanRefusalCode = 'DAILY_PLAN_REQUIRED' | 'TASK_NOT_PLANNED';

function localDayOf(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The day a plan belongs to, as the web reads it: a plan made from a day is stored at UTC midnight of that day; an
 * older one holds the instant it was made at, whose day is the person's own.
 */
function planDayOf(value: string | null | undefined): string | null {
	const date = new Date(value ?? '');
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	const isUtcMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
	const isWholeSecond = date.getUTCMilliseconds() === 0;
	if (isUtcMidnight && isWholeSecond) {
		return date.toISOString().slice(0, 10);
	}
	return localDayOf(date);
}

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
	const plansOfTheDay = input.plans.filter((plan) => planDayOf(plan.date) === input.planDay);
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
