import { ITag } from '@/core/types/interfaces/tag/tag';
import { atom } from 'jotai';

export const taskLabelsListState = atom<ITag[]>([]);

export const activeTaskLabelsIdState = atom<string | null>(null);

export const taskLabelsFetchingState = atom<boolean>(false);

export const activeTaskLabelsState = atom<ITag | null>((get) => {
	const taskLabels = get(taskLabelsListState);
	const activeId = get(activeTaskLabelsIdState);
	return taskLabels.find((priority) => priority.id === activeId) || taskLabels[0] || null;
});
