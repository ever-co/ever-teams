import { ITaskRelatedIssueTypeItemList } from '@app/interfaces';
import { atom, selector } from 'recoil';

export const taskRelatedIssueTypeListState = atom<
	ITaskRelatedIssueTypeItemList[]
>({
	key: 'taskRelatedIssueTypeListState',
	default: []
});

export const activeTaskRelatedIssueTypeIdState = atom<string | null>({
	key: 'activeTaskRelatedIssueTypeIdState',
	default: null
});

export const taskRelatedIssueTypeFetchingState = atom<boolean>({
	key: 'taskRelatedIssueTypeFetchingState',
	default: false
});

export const activeTaskRelatedIssueTypeState =
	selector<ITaskRelatedIssueTypeItemList | null>({
		key: 'activeTaskRelatedIssueTypeState',
		get: ({ get }) => {
			const taskRelatedIssueType = get(taskRelatedIssueTypeListState);
			const activeId = get(activeTaskRelatedIssueTypeIdState);
			return (
				taskRelatedIssueType.find(
					(relatedIssueType) => relatedIssueType.id === activeId
				) ||
				taskRelatedIssueType[0] ||
				null
			);
		}
	});
