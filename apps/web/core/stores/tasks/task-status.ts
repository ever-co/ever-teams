import { ITaskStatus } from '@/core/types/interfaces/task/task-status/ITaskStatus';
import { atom } from 'jotai';

export const taskStatusesState = atom<ITaskStatus[]>([]);

export const activeTaskStatusIdState = atom<string | null>(null);

export const taskStatusFetchingState = atom<boolean>(false);

export const activeTaskStatusState = atom<ITaskStatus | null>((get) => {
	const taskStatus = get(taskStatusesState);
	const activeId = get(activeTaskStatusIdState);
	return taskStatus.find((status) => status.id === activeId) || taskStatus[0] || null;
});
