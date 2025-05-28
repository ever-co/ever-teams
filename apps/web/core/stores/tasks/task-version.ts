import { ITaskVersion } from '@/core/types/interfaces/task/ITaskVersion';
import { atom } from 'jotai';

export const taskVersionListState = atom<ITaskVersion[]>([]);

export const activeTaskVersionIdState = atom<string | null>(null);

export const taskVersionFetchingState = atom<boolean>(false);

export const activeTaskVersionState = atom<ITaskVersion | null>((get) => {
	const taskVersion = get(taskVersionListState);
	const activeId = get(activeTaskVersionIdState);
	return taskVersion.find((version) => version.id === activeId) || taskVersion[0] || null;
});
