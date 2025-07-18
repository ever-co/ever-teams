import { TTaskVersion } from '@/core/types/schemas/task/task-version.schema';
import { atom } from 'jotai';

export const taskVersionsState = atom<TTaskVersion[]>([]);

export const activeTaskVersionIdState = atom<string | null>(null);

export const activeTaskVersionState = atom<TTaskVersion | null>((get) => {
	const taskVersion = get(taskVersionsState);
	const activeId = get(activeTaskVersionIdState);
	return taskVersion.find((version) => version.id === activeId) || taskVersion[0] || null;
});
