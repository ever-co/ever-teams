import moment from 'moment';
import { ITeamTask } from '@/core/types/interfaces/to-review/ITask';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { ITasksStatistics } from '../types/interfaces/task/ITask';

export const teamTasksState = atom<ITeamTask[]>([]);

export const activeTeamTaskState = atom<ITeamTask | null>(null);
export const activeTeamTaskId = atom<{ id: string }>({
	id: ''
});
export const tasksFetchingState = atom<boolean>(false);

export const detailedTaskState = atom<ITeamTask | null>(null);

// export const employeeTasksState = atom<ITeamTask[] | null>({
// 	key: 'employeeTasksState',
// 	default: null
// });

export const tasksByTeamState = atom<ITeamTask[]>((get) => {
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
export const favoriteTasksAtom = atom<ITeamTask[]>([]);
export const favoriteTasksStorageAtom = atomWithStorage<ITeamTask[]>('favoriteTasks', []);

export const activeTaskStatisticsState = atom<{
	total: ITasksStatistics | null;
	today: ITasksStatistics | null;
}>({
	total: null,
	today: null
});

export const allTaskStatisticsState = atom<ITasksStatistics[]>([]);
