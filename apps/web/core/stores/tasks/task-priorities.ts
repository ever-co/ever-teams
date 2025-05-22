import { ITaskPriority } from '@/core/types/interfaces/to-review/ITaskPriorities';
import { atom } from 'jotai';

export const taskPrioritiesListState = atom<ITaskPriority[]>([]);

export const activeTaskPrioritiesIdState = atom<string | null>(null);

export const taskPrioritiesFetchingState = atom<boolean>(false);

export const activeTaskPrioritiesState = atom<ITaskPriority | null>((get) => {
	const taskPriorities = get(taskPrioritiesListState);
	const activeId = get(activeTaskPrioritiesIdState);
	return taskPriorities.find((priority) => priority.id === activeId) || taskPriorities[0] || null;
});
