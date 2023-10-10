import { ITaskSizesItemList } from '@app/interfaces/ITaskSizes';
import { atom, selector } from 'recoil';

export const taskSizesListState = atom<ITaskSizesItemList[]>({
	key: 'taskSizesListState',
	default: []
});

export const activeTaskSizesIdState = atom<string | null>({
	key: 'activeTaskSizesIdState',
	default: null
});

export const taskSizesFetchingState = atom<boolean>({
	key: 'taskSizesFetchingState',
	default: false
});

export const activeTaskSizesState = selector<ITaskSizesItemList | null>({
	key: 'activeTaskSizesState',
	get: ({ get }) => {
		const taskSizes = get(taskSizesListState);
		const activeId = get(activeTaskSizesIdState);
		return (
			taskSizes.find((size) => size.id === activeId) || taskSizes[0] || null
		);
	}
});
