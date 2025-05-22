import { ITaskLabelsItemList } from '@/core/types/interfaces/ITaskLabels';
import { atom } from 'jotai';

export const taskLabelsListState = atom<ITaskLabelsItemList[]>([]);

export const activeTaskLabelsIdState = atom<string | null>(null);

export const taskLabelsFetchingState = atom<boolean>(false);

export const activeTaskLabelsState = atom<ITaskLabelsItemList | null>((get) => {
	const taskLabels = get(taskLabelsListState);
	const activeId = get(activeTaskLabelsIdState);
	return taskLabels.find((priority) => priority.id === activeId) || taskLabels[0] || null;
});
