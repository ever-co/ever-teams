import { TTaskPriority } from '@/core/types/schemas';
import { atom } from 'jotai';

export const taskPrioritiesListState = atom<TTaskPriority[]>([]);

export const activeTaskPrioritiesIdState = atom<string | null>(null);

export const taskPrioritiesFetchingState = atom<boolean>(false);

export const activeTaskPrioritiesState = atom<TTaskPriority | null>((get) => {
	const taskPriorities = get(taskPrioritiesListState);
	const activeId = get(activeTaskPrioritiesIdState);
	return taskPriorities.find((priority) => priority.id === activeId) || taskPriorities[0] || null;
});
