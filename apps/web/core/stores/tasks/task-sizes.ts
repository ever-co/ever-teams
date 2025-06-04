import { TTaskSize } from '@/core/types/schemas';
import { atom } from 'jotai';

export const taskSizesListState = atom<TTaskSize[]>([]);

export const activeTaskSizesIdState = atom<string | null>(null);

export const taskSizesFetchingState = atom<boolean>(false);

export const activeTaskSizesState = atom<TTaskSize | null>((get) => {
	const taskSizes = get(taskSizesListState);
	const activeId = get(activeTaskSizesIdState);
	return taskSizes.find((size) => size.id === activeId) || taskSizes[0] || null;
});
