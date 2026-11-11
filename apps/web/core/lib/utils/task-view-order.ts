import type { TeamTasksListRow } from './team-tasks-view';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** The most task ids a view's manual order holds (the platform's limit). */
export const TASK_VIEW_ORDER_MAX = 5000;

/** Which side of the task it is dropped on a moved task lands. */
type TaskOrderEdge = 'before' | 'after';

/** One task put right before or right after another task of the list. */
export interface TaskOrderMove {
	taskId: string;
	targetId: string;
	edge: TaskOrderEdge;
}

/** A step the row's menu moves a task by, inside its group. */
export type TaskOrderStep = 'up' | 'down' | 'top' | 'bottom';

type OrderedTask = Pick<TTask, 'id' | 'createdAt'>;

function uniqueIdsOf(ids: readonly string[] | null | undefined): string[] {
	return [...new Set((ids ?? []).map(String))];
}

function createdTimeOf(task: OrderedTask) {
	if (!task.createdAt) {
		return null;
	}
	const time = new Date(task.createdAt).getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	return time;
}

/** Newest first, by creation then by id, as the platform lists the tasks a manual order does not name. */
function newestFirst(first: OrderedTask, second: OrderedTask) {
	const firstTime = createdTimeOf(first);
	const secondTime = createdTimeOf(second);
	if (firstTime !== secondTime) {
		if (firstTime === null) return 1;
		if (secondTime === null) return -1;
		return secondTime - firstTime;
	}
	if (first.id === second.id) return 0;
	return first.id < second.id ? 1 : -1;
}

/**
 * The tasks in a view's manual order, as the platform pages them: the tasks the order names, in that order, then the
 * others, newest first.
 */
export function sortByManualOrder<T extends OrderedTask>(
	tasks: readonly T[],
	manualOrder: readonly string[] | null | undefined
): T[] {
	const position = new Map<string, number>();
	uniqueIdsOf(manualOrder).forEach((id, index) => position.set(id, index));
	return [...tasks].sort((first, second) => {
		const firstPosition = position.get(first.id);
		const secondPosition = position.get(second.id);
		if (firstPosition !== undefined && secondPosition !== undefined) return firstPosition - secondPosition;
		if (firstPosition !== undefined) return -1;
		if (secondPosition !== undefined) return 1;
		return newestFirst(first, second);
	});
}

function isSameShownOrder(first: readonly string[], second: readonly string[], shown: ReadonlySet<string>) {
	const firstShown = first.filter((id) => shown.has(id));
	const secondShown = second.filter((id) => shown.has(id));
	return firstShown.every((id, index) => id === secondShown[index]);
}

/** Takes ids out from the end, the ones `isDropped` names, until the order fits the limit. */
function dropFromEnd(order: string[], isDropped: (id: string) => boolean) {
	let excess = order.length - TASK_VIEW_ORDER_MAX;
	for (let index = order.length - 1; index >= 0 && excess > 0; index -= 1) {
		if (isDropped(order[index])) {
			order.splice(index, 1);
			excess -= 1;
		}
	}
}

/**
 * At most {@link TASK_VIEW_ORDER_MAX} ids. The tasks the list does not show go first, from the end; then the last shown
 * ones, never the moved task or its target, so the move holds (the tasks left out follow, newest first).
 */
function withinLimit(order: string[], shown: ReadonlySet<string>, move: TaskOrderMove) {
	if (order.length <= TASK_VIEW_ORDER_MAX) {
		return order;
	}
	const kept = [...order];
	dropFromEnd(kept, (id) => !shown.has(id));
	dropFromEnd(kept, (id) => id !== move.taskId && id !== move.targetId);
	return kept;
}

/**
 * A view's manual order once a task moved next to another one. The tasks the list shows and the order does not name
 * yet join it in the order they are shown, so what the person saw is what is kept; the tasks it does not show (done,
 * filtered out) keep their places. A move names a task and its neighbour, not a position, so it applies as well to
 * an order someone else saved meanwhile. `null` when the list would not change: a task dropped on itself or where it
 * already is, or a task the list does not show.
 */
export function orderAfterMove(
	manualOrder: readonly string[] | null | undefined,
	shownIds: readonly string[],
	move: TaskOrderMove
): string[] | null {
	const { taskId, targetId, edge } = move;
	const shown = new Set(shownIds);
	if (taskId === targetId || !shown.has(taskId) || !shown.has(targetId)) {
		return null;
	}
	const order = uniqueIdsOf(manualOrder);
	const named = new Set(order);
	const current = [...order, ...shownIds.filter((id) => !named.has(id))];
	const next = current.filter((id) => id !== taskId);
	const targetIndex = next.indexOf(targetId);
	next.splice(edge === 'before' ? targetIndex : targetIndex + 1, 0, taskId);
	if (isSameShownOrder(current, next, shown)) {
		return null;
	}
	return withinLimit(next, shown, move);
}

/** The move a step of the row's menu makes inside the task's group; `null` when the task is already there. */
export function stepMoveOf(groupIds: readonly string[], taskId: string, step: TaskOrderStep): TaskOrderMove | null {
	const index = groupIds.indexOf(taskId);
	const last = groupIds.length - 1;
	if (index < 0) {
		return null;
	}
	const goesUp = step === 'up' || step === 'top';
	if ((goesUp && index === 0) || (!goesUp && index === last)) {
		return null;
	}
	if (step === 'up') return { taskId, targetId: groupIds[index - 1], edge: 'before' };
	if (step === 'down') return { taskId, targetId: groupIds[index + 1], edge: 'after' };
	if (step === 'top') return { taskId, targetId: groupIds[0], edge: 'before' };
	return { taskId, targetId: groupIds[last], edge: 'after' };
}

/**
 * The tasks of the task's group, in the order the list shows them: the group of the row it was picked in (a task
 * with several assignees has a row under each), else of its first row.
 */
export function groupTaskIdsOf(rows: readonly TeamTasksListRow[], taskId: string, groupKey?: string | null): string[] {
	const isTaskRow = (item: TeamTasksListRow) => item.kind === 'task' && item.task.id === taskId;
	const row = rows.find((item) => isTaskRow(item) && item.group.key === groupKey) ?? rows.find(isTaskRow);
	if (!row) {
		return [];
	}
	return row.group.tasks.map((task) => task.id);
}
