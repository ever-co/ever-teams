import { ITaskVersionItemList } from '@app/interfaces';
import { atom, selector } from 'recoil';

export const taskVersionListState = atom<ITaskVersionItemList[]>({
	key: 'taskVersionListState',
	default: []
});

export const activeTaskVersionIdState = atom<string | null>({
	key: 'activeTaskVersionIdState',
	default: null
});

export const taskVersionFetchingState = atom<boolean>({
	key: 'taskVersionFetchingState',
	default: false
});

export const activeTaskVersionState = selector<ITaskVersionItemList | null>({
	key: 'activeTaskVersionState',
	get: ({ get }) => {
		const taskVersion = get(taskVersionListState);
		const activeId = get(activeTaskVersionIdState);
		return (
			taskVersion.find((version) => version.id === activeId) ||
			taskVersion[0] ||
			null
		);
	}
});
