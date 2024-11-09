import { ITaskPrioritiesItemList } from '@app/interfaces/ITaskPriorities';
import { atom } from 'jotai';

export const taskPrioritiesListState = atom<ITaskPrioritiesItemList[]>([]);

export const activeTaskPrioritiesIdState = atom<string | null>(null);

export const taskPrioritiesFetchingState = atom<boolean>(false);

export const activeTaskPrioritiesState = atom<ITaskPrioritiesItemList | null>(
  (get) => {
    const taskPriorities = get(taskPrioritiesListState);
    const activeId = get(activeTaskPrioritiesIdState);
    return (
      taskPriorities.find((priority) => priority.id === activeId) ||
      taskPriorities[0] ||
      null
    );
  }
);
