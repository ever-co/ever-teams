import { ITaskPrioritiesItemList } from '@app/interfaces/ITaskPriorities';
import { atom, selector } from 'recoil';

export const taskPrioritiesListState = atom<ITaskPrioritiesItemList[]>({
	key: 'taskPrioritiesListState',
	default: []
});

export const activeTaskPrioritiesIdState = atom<string | null>({
	key: 'activeTaskPrioritiesIdState',
	default: null
});

export const taskPrioritiesFetchingState = atom<boolean>({
	key: 'taskPrioritiesFetchingState',
	default: false
});

export const activeTaskPrioritiesState = selector<ITaskPrioritiesItemList | null>({
	key: 'activeTaskPrioritiesState',
	get: ({ get }) => {
		const taskPriorities = get(taskPrioritiesListState);
		const activeId = get(activeTaskPrioritiesIdState);
		return taskPriorities.find((priority) => priority.id === activeId) || taskPriorities[0] || null;
	}
});
