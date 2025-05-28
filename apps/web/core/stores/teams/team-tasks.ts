import moment from 'moment';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { ITasksStatistics } from '@/core/types/interfaces/task/ITask';

export const teamTasksState = atom<ITask[]>([]);

export const activeTeamTaskState = atom<ITask | null>(null);
export const activeTeamTaskId = atom<{ id: string }>({
	id: ''
});
export const tasksFetchingState = atom<boolean>(false);

export const detailedTaskState = atom<ITask | null>(null);

// export const employeeTasksState = atom<ITask[] | null>({
// 	key: 'employeeTasksState',
// 	default: null
// });

export const tasksByTeamState = atom<ITask[]>((get) => {
	const tasks = get(teamTasksState);

	return tasks
		.filter(() => {
			return true;
		})
		.sort((a, b) => moment(b.createdAt).diff(a.createdAt));
});

export const tasksStatisticsState = atom<{
	all: ITasksStatistics[];
	today: ITasksStatistics[];
}>({
	all: [],
	today: []
});
export const favoriteTasksAtom = atom<ITask[]>([]);
export const favoriteTasksStorageAtom = atomWithStorage<ITask[]>('favoriteTasks', []);

export const activeTaskStatisticsState = atom<{
	total: ITasksStatistics | null;
	today: ITasksStatistics | null;
}>({
	total: null,
	today: null
});

export const allTaskStatisticsState = atom<ITasksStatistics[]>([]);
