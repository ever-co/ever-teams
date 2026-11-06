import type { Query, QueryClient } from '@tanstack/react-query';

const TASK_QUERIES_ROOT = 'tasks';
const DAILY_PLAN_QUERIES_ROOT = 'daily-plans';
// The team's task pages, every page loaded so far: the optimistic update already put the edit in them
const TEAM_TASK_PAGES_KIND = 'by-team-scope';
const TASK_ACTIVITY_LOG_KIND = 'activity-log';

function isTaskOrPlanQuery(query: Query) {
	const root = query.queryKey[0];
	const isTaskQuery = root === TASK_QUERIES_ROOT;
	const isPlanQuery = root === DAILY_PLAN_QUERIES_ROOT;
	return isTaskQuery || isPlanQuery;
}

function isTeamTaskPagesQuery(query: Query) {
	const isTaskQuery = query.queryKey[0] === TASK_QUERIES_ROOT;
	const isTeamPages = query.queryKey[1] === TEAM_TASK_PAGES_KIND;
	return isTaskQuery && isTeamPages;
}

/** The task's own queries: its detail, activity and linked tasks (`['tasks', taskId, ...]`) and its activity log. */
function isOwnTaskQuery(query: Query, taskId: string) {
	const isTaskQuery = query.queryKey[0] === TASK_QUERIES_ROOT;
	const isUnderTaskId = query.queryKey[1] === taskId;
	const isActivityLog = query.queryKey[1] === TASK_ACTIVITY_LOG_KIND;
	const isThisActivityLog = isActivityLog && query.queryKey[4] === taskId;
	return isTaskQuery && (isUnderTaskId || isThisActivityLog);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Whether cached data holds the task: a task list, a paginated or paged list, plans and their tasks. */
function holdsTask(data: unknown, taskId: string): boolean {
	if (Array.isArray(data)) {
		return data.some((item) => holdsTask(item, taskId));
	}
	if (!isRecord(data)) {
		return false;
	}
	if (data.id === taskId) {
		return true;
	}
	const nestedLists = [data.items, data.pages, data.tasks, data.data];
	return nestedLists.some((nested) => holdsTask(nested, taskId));
}

function showsUpdatedTask(query: Query, taskId: string) {
	if (isTeamTaskPagesQuery(query)) {
		return false;
	}
	if (isOwnTaskQuery(query, taskId)) {
		return true;
	}
	return holdsTask(query.state.data, taskId);
}

/**
 * After a successful task update: the queries that show the task (its detail, activity and log, the other lists and the
 * plans that hold it) are read again now. Every other task and plan query is only marked stale, read again when next
 * mounted or on its own refresh, instead of all of them, the team's task pages included, being fetched on each edit.
 */
export function refreshAfterTaskUpdate(queryClient: QueryClient, taskId: string) {
	queryClient.invalidateQueries({
		predicate: (query) => isTaskOrPlanQuery(query) && showsUpdatedTask(query, taskId)
	});
	queryClient.invalidateQueries({
		predicate: (query) => isTaskOrPlanQuery(query) && !showsUpdatedTask(query, taskId),
		refetchType: 'none'
	});
}
