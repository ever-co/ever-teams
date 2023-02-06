import { ITaskStatusItemList } from '@app/interfaces/ITaskStatus';
import { atom, selector } from 'recoil';

export const taskStatusListState = atom<ITaskStatusItemList[]>({
	key: 'taskStatusListState',
	default: [],
});

export const activeTaskStatusIdState = atom<string | null>({
	key: 'activeTaskStatusIdState',
	default: null,
});

export const taskStatusFetchingState = atom<boolean>({
	key: 'taskStatusFetchingState',
	default: false,
});

export const activeTaskStatusState = selector<ITaskStatusItemList | null>({
	key: 'activeTaskStatusState',
	get: ({ get }) => {
		const taskStatus = get(taskStatusListState);
		const activeId = get(activeTaskStatusIdState);
		return (
			taskStatus.find((status) => status.id === activeId) ||
			taskStatus[0] ||
			null
		);
	},
});
