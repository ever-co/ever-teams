import type { TDailyPlan } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** The id of the list of a person's open tasks that are in no plan, kept beside their past plans. */
export const OUTSTANDING_NO_PLAN_ID = 'outstanding-no-plan';

interface OutstandingNoticeTasks {
	tasks: Partial<TTask>[];
	count: number;
}

/**
 * What the home's notice "tasks from past plans are still open" counts: the unfinished tasks of the person's past
 * plans, each once. The tasks that were never planned are left out: the notice says "from past plans", and Review plans
 * opens a view that lists the tasks of plans only (#5715).
 */
export function outstandingNoticeTasksOf(outstandingPlans: ReadonlyArray<TDailyPlan>): OutstandingNoticeTasks {
	const pastPlans = outstandingPlans.filter((plan) => plan.id !== OUTSTANDING_NO_PLAN_ID);
	const plannedTasks = pastPlans.flatMap((plan) => plan.tasks || []);
	const tasks = plannedTasks.filter((task) => task?.id);
	const uniqueIds = new Set(tasks.map((task) => task.id));
	return { tasks: tasks as Partial<TTask>[], count: uniqueIds.size };
}
