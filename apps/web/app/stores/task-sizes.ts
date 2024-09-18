import { ITaskSizesItemList } from '@app/interfaces/ITaskSizes';
import { atom } from 'jotai';

export const taskSizesListState = atom<ITaskSizesItemList[]>([]);

export const activeTaskSizesIdState = atom<string | null>(null);

export const taskSizesFetchingState = atom<boolean>(false);

export const activeTaskSizesState = atom<ITaskSizesItemList | null>((get) => {
  const taskSizes = get(taskSizesListState);
  const activeId = get(activeTaskSizesIdState);
  return taskSizes.find((size) => size.id === activeId) || taskSizes[0] || null;
});
