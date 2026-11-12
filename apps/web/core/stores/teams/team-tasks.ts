import moment from 'moment';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';

export const teamTasksState = atom<TTask[]>([]);
// False while team task pages are still loading: a task missing from the list may simply not be loaded yet.
export const teamTasksCompleteState = atom<boolean>(false);
// True only while the owner is still fetching team task pages: false after a page error, once the restart budget is
// spent, or when the query is disabled. Creating a task waits for this, never for a list that will not complete.
export const teamTasksPagesLoadingState = atom<boolean>(false);

export const activeTeamTaskState = atom<TTask | null>(null);
/**
 * The active task the person has just left on purpose, by leaving the task or closing it. The timer's task-switch stop
 * ends a run on it, as when they switch to another task, while an active task the app empties by itself never stops
 * a run (#5119). The timer owner clears it once it has seen the change.
 */
export const leftActiveTaskIdState = atom<string | null>(null);
export const activeTeamTaskId = atom<{ id: string }>({
	id: ''
});
export const tasksFetchingState = atom<boolean>(false);

export const detailedTaskState = atom<TTask | null>(null);

// export const employeeTasksState = atom<TTask[] | null>({
// 	key: 'employeeTasksState',
// 	default: null
// });

function createdAtTime(task: TTask) {
	return moment(task.createdAt).valueOf();
}

// Newest first. createdAt is parsed once per task instead of twice per comparison; moment still reads it, so a
// missing date counts as now and an invalid one compares as equal, as in the former comparator.
function sortNewestFirst(tasks: TTask[]) {
	const timedTasks = tasks.map((task) => ({ task, time: createdAtTime(task) }));
	timedTasks.sort((a, b) => b.time - a.time);
	return timedTasks.map((timedTask) => timedTask.task);
}

export const tasksByTeamState = atom<TTask[]>((get) => {
	const tasks = get(teamTasksState);
	return sortNewestFirst(tasks);
});

export const tasksStatisticsState = atom<{
	all: TTaskStatistic[];
	today: TTaskStatistic[];
}>({
	all: [],
	today: []
});
export const favoriteTasksAtom = atom<TTask[]>([]);
export const favoriteTasksStorageAtom = atomWithStorage<TTask[]>('favoriteTasks', []);

export const activeTaskStatisticsState = atom<{
	total: TTaskStatistic | null;
	today: TTaskStatistic | null;
}>({
	total: null,
	today: null
});

export const allTaskStatisticsState = atom<TTaskStatistic[]>([]);
