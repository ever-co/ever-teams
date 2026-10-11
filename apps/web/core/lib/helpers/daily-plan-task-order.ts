import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * Sorts a plan's tasks by its saved `taskOrder`. The API stores that list as sent and does not sort
 * `tasks` by it, so a task missing from the list (added after the last reorder) goes after the
 * listed ones, in the order it came in. The returned `taskOrder` lists every task of the plan in
 * that order, so a move made in a view that hides some tasks leaves the hidden ones in place.
 */
export const orderPlanTasks = (plan: TDailyPlan): TDailyPlan => {
	if (!plan.tasks?.length) return plan;

	const order = plan.taskOrder ?? [];
	const rank = new Map<string, number>();
	order.forEach((id, index) => {
		if (!rank.has(id)) rank.set(id, index);
	});
	const rankOf = (task: TTask) => rank.get(task.id) ?? order.length;
	const tasks = [...plan.tasks].sort((a, b) => rankOf(a) - rankOf(b));

	return { ...plan, tasks, taskOrder: [...new Set([...order, ...tasks.map((task) => task.id)])] };
};

/** `select` for the daily plan list queries: the plans come out with their tasks in the saved order. */
export const orderTasksInPlans = (data: PaginationResponse<TDailyPlan>): PaginationResponse<TDailyPlan> => ({
	...data,
	items: data.items.map(orderPlanTasks)
});

/**
 * The plan's new `taskOrder` once the task shown at `from` is dropped at `to`. `plan.tasks` may be a
 * filtered part of the plan: the tasks it leaves out keep their saved place.
 */
export const movePlanTask = (plan: TDailyPlan, from: number, to: number): string[] => {
	const shown = plan.tasks?.map((task) => task.id) ?? [];
	const moved = [...shown];
	const [movedId] = moved.splice(from, 1);
	moved.splice(to, 0, movedId);

	const shownIds = new Set(shown);
	let next = 0;
	return [...new Set([...(plan.taskOrder ?? []), ...shown])].map((id) => (shownIds.has(id) ? moved[next++] : id));
};
