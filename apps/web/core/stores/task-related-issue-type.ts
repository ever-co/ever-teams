import { ITaskRelatedIssueTypeItemList } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const taskRelatedIssueTypeListState = atom<ITaskRelatedIssueTypeItemList[]>([]);

export const activeTaskRelatedIssueTypeIdState = atom<string | null>(null);

export const taskRelatedIssueTypeFetchingState = atom<boolean>(false);

export const activeTaskRelatedIssueTypeState = atom<ITaskRelatedIssueTypeItemList | null>((get) => {
	const taskRelatedIssueType = get(taskRelatedIssueTypeListState);
	const activeId = get(activeTaskRelatedIssueTypeIdState);
	return (
		taskRelatedIssueType.find((relatedIssueType) => relatedIssueType.id === activeId) ||
		taskRelatedIssueType[0] ||
		null
	);
});
