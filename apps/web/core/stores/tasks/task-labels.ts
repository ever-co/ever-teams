import { TTag } from '@/core/types/schemas';
import { atom } from 'jotai';

export const taskLabelsListState = atom<TTag[]>([]);

export const activeTaskLabelsIdState = atom<string | null>(null);

export const taskLabelsFetchingState = atom<boolean>(false);

export const activeTaskLabelsState = atom<TTag | null>((get) => {
	const taskLabels = get(taskLabelsListState);
	const activeId = get(activeTaskLabelsIdState);
	return taskLabels.find((priority) => priority.id === activeId) || taskLabels[0] || null;
});
