import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import type { useStore } from 'jotai';
import { queryKeys } from '@/core/query/keys';
import { viewTasksState } from '@/core/stores/tasks/task-views';
import type { ITaskBuiltInViewPage } from '@/core/types/interfaces/common/task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type BuiltInViewTasks = ITaskBuiltInViewPage<TTask>;
type TaskField = keyof TTask;
type JotaiStore = ReturnType<typeof useStore>;

/** A task as one cached built-in view listed it before a change. */
interface ListedTask {
	queryKey: QueryKey;
	task: TTask;
}

function taskIn(tasks: TTask[], taskId: string) {
	return tasks.find((task) => task.id === taskId);
}

function holdsTask(tasks: TTask[], taskId: string) {
	return tasks.some((task) => task.id === taskId);
}

function tasksOf(data: BuiltInViewTasks | undefined) {
	return data?.items ?? [];
}

function viewsListing(taskId: string) {
	return {
		queryKey: queryKeys.taskViews.builtInAll,
		predicate: (query: Query) => {
			const data = query.state.data as BuiltInViewTasks | undefined;
			const tasks = tasksOf(data);
			return holdsTask(tasks, taskId);
		}
	};
}

function replacedBy(task: TTask, replacement: TTask) {
	if (task.id === replacement.id) {
		return replacement;
	}
	return task;
}

function withTask(tasks: TTask[], replacement: TTask) {
	return tasks.map((task) => replacedBy(task, replacement));
}

function fieldsOf(task: TTask, fields: readonly TaskField[]) {
	const entries = fields.map((field) => [field, task[field]]);
	return Object.fromEntries(entries) as Partial<TTask>;
}

/**
 * The tasks with the changed fields of the task as they were. The other fields keep what a read brought in since (a
 * colleague's change), and a list that no longer holds the task stays as it is.
 */
function withFieldsRestored(tasks: TTask[], previousTask: TTask, fields: readonly TaskField[]) {
	const currentTask = taskIn(tasks, previousTask.id);
	if (!currentTask) {
		return tasks;
	}
	const previousFields = fieldsOf(previousTask, fields);
	const restoredTask = { ...currentTask, ...previousFields };
	return withTask(tasks, restoredTask);
}

function withCachedFieldsRestored(
	data: BuiltInViewTasks | undefined,
	previousTask: TTask,
	fields: readonly TaskField[]
) {
	if (!data) {
		return data;
	}
	const items = withFieldsRestored(data.items, previousTask, fields);
	return { ...data, items };
}

function showChangeInCachedViews(queryClient: QueryClient, taskId: string, changes: Partial<TTask>) {
	const filters = viewsListing(taskId);
	// A read on its way would answer with the task as it was. Cancelling it puts the view back to its last data at once
	// (the promise only settles the read), so the change goes in now and the save is not delayed.
	void queryClient.cancelQueries(filters);
	const listedTasks: ListedTask[] = [];
	for (const [queryKey, data] of queryClient.getQueriesData<BuiltInViewTasks>(filters)) {
		const tasks = tasksOf(data);
		const task = taskIn(tasks, taskId);
		if (!data || !task) {
			continue;
		}
		listedTasks.push({ queryKey, task });
		const changedTask = { ...task, ...changes };
		const items = withTask(tasks, changedTask);
		queryClient.setQueryData<BuiltInViewTasks>(queryKey, { ...data, items });
	}
	return listedTasks;
}

/**
 * The open view's tasks, which the pickers and the next queued change read: the page copies them from the cached view
 * only once it renders, which can be after the next queued change has read them.
 */
function showChangeInOpenView(store: JotaiStore, taskId: string, changes: Partial<TTask>) {
	const tasks = store.get(viewTasksState);
	const task = taskIn(tasks, taskId);
	if (!task) {
		return undefined;
	}
	const changedTask = { ...task, ...changes };
	const changedTasks = withTask(tasks, changedTask);
	store.set(viewTasksState, changedTasks);
	return task;
}

/**
 * Shows a task's change at once in the copies the built-in views keep of it: every cached view that lists it (the
 * optimistic update of the team's task list does not reach them), and the open view's tasks. Answers what puts them
 * back when the save fails: the fields the change set, as each copy held them, and nothing else.
 */
export function showTaskChangeInBuiltInViews(
	queryClient: QueryClient,
	store: JotaiStore,
	taskId: string,
	changes: Partial<TTask>
) {
	const changedFields = Object.keys(changes) as TaskField[];
	const listedTasks = showChangeInCachedViews(queryClient, taskId, changes);
	const openViewTask = showChangeInOpenView(store, taskId, changes);
	return () => {
		for (const listed of listedTasks) {
			queryClient.setQueryData<BuiltInViewTasks>(listed.queryKey, (data) =>
				withCachedFieldsRestored(data, listed.task, changedFields)
			);
		}
		if (!openViewTask) {
			return;
		}
		const openViewTasks = store.get(viewTasksState);
		const restoredTasks = withFieldsRestored(openViewTasks, openViewTask, changedFields);
		store.set(viewTasksState, restoredTasks);
	};
}
