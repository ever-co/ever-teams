import moment from 'moment';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';

export const teamTasksState = atom<TTask[]>([]);

export const activeTeamTaskState = atom<TTask | null>(null);
export const activeTeamTaskId = atom<{ id: string }>({
	id: ''
});
export const tasksFetchingState = atom<boolean>(false);

export const detailedTaskState = atom<TTask | null>(null);

// export const employeeTasksState = atom<TTask[] | null>({
// 	key: 'employeeTasksState',
// 	default: null
// });

export const tasksByTeamState = atom<TTask[]>((get) => {
	const tasks = get(teamTasksState);

	return tasks
		.filter(() => {
			return true;
		})
		.sort((a, b) => moment(b.createdAt).diff(a.createdAt));
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
