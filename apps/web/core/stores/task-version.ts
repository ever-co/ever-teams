import { ITaskVersionItemList } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const taskVersionListState = atom<ITaskVersionItemList[]>([]);

export const activeTaskVersionIdState = atom<string | null>(null);

export const taskVersionFetchingState = atom<boolean>(false);

export const activeTaskVersionState = atom<ITaskVersionItemList | null>((get) => {
	const taskVersion = get(taskVersionListState);
	const activeId = get(activeTaskVersionIdState);
	return taskVersion.find((version) => version.id === activeId) || taskVersion[0] || null;
});
