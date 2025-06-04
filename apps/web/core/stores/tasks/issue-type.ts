import { atom } from 'jotai';
import { IIssueType } from '@/core/types/interfaces/task/issue-type';

export const issueTypesListState = atom<IIssueType[]>([]);

export const activeIssueTypesIdState = atom<string | null>(null);

export const issueTypesFetchingState = atom<boolean>(false);

export const activeIssueTypesState = atom<IIssueType | null>((get) => {
	const issueTypes = get(issueTypesListState);
	const activeId = get(activeIssueTypesIdState);
	return issueTypes.find((issueType) => issueType.id === activeId) || issueTypes[0] || null;
});
