import { ITaskStatusItemList } from '@app/interfaces/ITaskStatus';
import { atom } from 'jotai';

export const taskStatusListState = atom<ITaskStatusItemList[]>([]);

export const activeTaskStatusIdState = atom<string | null>(null);

export const taskStatusFetchingState = atom<boolean>(false);

export const activeTaskStatusState = atom<ITaskStatusItemList | null>((get) => {
  const taskStatus = get(taskStatusListState);
  const activeId = get(activeTaskStatusIdState);
  return (
    taskStatus.find((status) => status.id === activeId) || taskStatus[0] || null
  );
});
