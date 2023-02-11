import { ITaskLabelsItemList } from '@app/interfaces/ITaskLabels';
import { atom, selector } from 'recoil';

export const taskLabelsListState = atom<ITaskLabelsItemList[]>({
	key: 'taskLabelsListState',
	default: [],
});

export const activeTaskLabelsIdState = atom<string | null>({
	key: 'activeTaskLabelsIdState',
	default: null,
});

export const taskLabelsFetchingState = atom<boolean>({
	key: 'taskLabelsFetchingState',
	default: false,
});

export const activeTaskLabelsState = selector<ITaskLabelsItemList | null>({
	key: 'activeTaskLabelsState',
	get: ({ get }) => {
		const taskLabels = get(taskLabelsListState);
		const activeId = get(activeTaskLabelsIdState);
		return (
			taskLabels.find((priority) => priority.id === activeId) ||
			taskLabels[0] ||
			null
		);
	},
});
