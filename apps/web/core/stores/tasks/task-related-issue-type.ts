import { ITaskRelatedIssueType } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const taskRelatedIssueTypeListState = atom<ITaskRelatedIssueType[]>([]);

export const activeTaskRelatedIssueTypeIdState = atom<string | null>(null);

export const taskRelatedIssueTypeFetchingState = atom<boolean>(false);

export const activeTaskRelatedIssueTypeState = atom<ITaskRelatedIssueType | null>((get) => {
	const taskRelatedIssueType = get(taskRelatedIssueTypeListState);
	const activeId = get(activeTaskRelatedIssueTypeIdState);
	return (
		taskRelatedIssueType.find((relatedIssueType) => relatedIssueType.id === activeId) ||
		taskRelatedIssueType[0] ||
		null
	);
});
