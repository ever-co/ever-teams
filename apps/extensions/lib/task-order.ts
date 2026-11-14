export interface OrderableTask {
	id: string;
	title: string;
	taskNumber?: string | null;
	updatedAt?: string | null;
}

const RECENT_LIMIT = 5;

/** The update date as epoch milliseconds; a task without one sorts last. */
function updatedTime(task: OrderableTask): number {
	const time = Date.parse(task.updatedAt ?? '');
	if (Number.isNaN(time)) {
		return Number.NEGATIVE_INFINITY;
	}
	return time;
}

/** Whether a task's title or number ("#12" or "12") holds the search, without regard to case. */
function matchesSearch(task: OrderableTask, search: string): boolean {
	const title = task.title.toLowerCase();
	if (title.includes(search)) {
		return true;
	}
	const number = (task.taskNumber ?? '').toLowerCase();
	const numberSearch = search.replace(/^#/, '');
	const hasNumberSearch = numberSearch.length > 0;
	return hasNumberSearch && number.includes(numberSearch);
}

/**
 * The tasks a person may start, filtered by the search: the ones they used recently first, in the order they were
 * used, then the others from the most recently updated.
 */
export function orderTasks<T extends OrderableTask>(tasks: T[], recentIds: string[], query: string): T[] {
	const search = query.trim().toLowerCase();
	const found = tasks.filter((task) => matchesSearch(task, search));
	const recentRank = new Map(recentIds.map((id, index) => [id, index]));
	const recent = found.filter((task) => recentRank.has(task.id));
	const others = found.filter((task) => !recentRank.has(task.id));

	recent.sort((left, right) => (recentRank.get(left.id) ?? 0) - (recentRank.get(right.id) ?? 0));
	others.sort((left, right) => updatedTime(right) - updatedTime(left));

	return [...recent, ...others];
}

/** The recent list after a start on `taskId`: that task first, once, at most `limit` tasks. */
export function rememberRecent(recentIds: string[], taskId: string, limit = RECENT_LIMIT): string[] {
	const others = recentIds.filter((id) => id !== taskId);

	return [taskId, ...others].slice(0, limit);
}
