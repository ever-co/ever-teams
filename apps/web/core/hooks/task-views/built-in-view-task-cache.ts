import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import type { ITaskBuiltInViewPage } from '@/core/types/interfaces/common/task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type BuiltInViewTasks = ITaskBuiltInViewPage<TTask>;
type TaskField = keyof TTask;

/** A task as one cached built-in view listed it before a change. */
interface ListedTask {
	queryKey: QueryKey;
	task: TTask;
}

function listedTaskOf(data: BuiltInViewTasks | undefined, taskId: string) {
	const tasks = data?.items ?? [];
	return tasks.find((task) => task.id === taskId);
}

function viewsListing(taskId: string) {
	return {
		queryKey: queryKeys.taskViews.builtInAll,
		predicate: (query: Query) => {
			const data = query.state.data as BuiltInViewTasks | undefined;
			return listedTaskOf(data, taskId) !== undefined;
		}
	};
}

function replacedBy(task: TTask, replacement: TTask) {
	if (task.id === replacement.id) {
		return replacement;
	}
	return task;
}

function withTask(data: BuiltInViewTasks, replacement: TTask): BuiltInViewTasks {
	const items = data.items.map((task) => replacedBy(task, replacement));
	return { ...data, items };
}

function fieldsOf(task: TTask, fields: readonly TaskField[]) {
	const entries = fields.map((field) => [field, task[field]]);
	return Object.fromEntries(entries) as Partial<TTask>;
}

/**
 * The view with the changed fields of the task as they were. The other fields keep what a read brought in since (a
 * colleague's change), and a view that no longer lists the task stays as it is.
 */
function withFieldsRestored(data: BuiltInViewTasks | undefined, previousTask: TTask, fields: readonly TaskField[]) {
	const currentTask = listedTaskOf(data, previousTask.id);
	if (!data || !currentTask) {
		return data;
	}
	const previousFields = fieldsOf(previousTask, fields);
	const restoredTask = { ...currentTask, ...previousFields };
	return withTask(data, restoredTask);
}

/**
 * Shows a task's change at once in every cached built-in view that lists it: a built-in view draws the tasks its own
 * query returned, which the optimistic update of the team's task list does not reach. Answers what puts those views
 * back when the save fails: the fields the change set, as each view listed them, and nothing else.
 */
export function showTaskChangeInBuiltInViews(queryClient: QueryClient, taskId: string, changes: Partial<TTask>) {
	const changedFields = Object.keys(changes) as TaskField[];
	const filters = viewsListing(taskId);
	// A read on its way would answer with the task as it was. Cancelling it puts the view back to its last data at once
	// (the promise only settles the read), so the change goes in now and the save is not delayed.
	void queryClient.cancelQueries(filters);
	const listedTasks: ListedTask[] = [];
	for (const [queryKey, data] of queryClient.getQueriesData<BuiltInViewTasks>(filters)) {
		if (!data) {
			continue;
		}
		const task = listedTaskOf(data, taskId);
		if (!task) {
			continue;
		}
		listedTasks.push({ queryKey, task });
		const changedTask = { ...task, ...changes };
		queryClient.setQueryData<BuiltInViewTasks>(queryKey, withTask(data, changedTask));
	}
	return () => {
		for (const listed of listedTasks) {
			queryClient.setQueryData<BuiltInViewTasks>(listed.queryKey, (data) =>
				withFieldsRestored(data, listed.task, changedFields)
			);
		}
	};
}
