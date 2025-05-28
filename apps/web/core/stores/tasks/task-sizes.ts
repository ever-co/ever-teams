import { ITaskSize } from '@/core/types/interfaces/task/ITaskSize';
import { atom } from 'jotai';

export const taskSizesListState = atom<ITaskSize[]>([]);

export const activeTaskSizesIdState = atom<string | null>(null);

export const taskSizesFetchingState = atom<boolean>(false);

export const activeTaskSizesState = atom<ITaskSize | null>((get) => {
	const taskSizes = get(taskSizesListState);
	const activeId = get(activeTaskSizesIdState);
	return taskSizes.find((size) => size.id === activeId) || taskSizes[0] || null;
});
