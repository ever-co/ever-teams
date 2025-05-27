import { atom } from 'jotai';
import { IIssueType } from '../types/interfaces/task/IIssueType';

export const issueTypesListState = atom<IIssueType[]>([]);

export const activeIssueTypesIdState = atom<string | null>(null);

export const issueTypesFetchingState = atom<boolean>(false);

export const activeIssueTypesState = atom<IIssueType | null>((get) => {
	const issueTypes = get(issueTypesListState);
	const activeId = get(activeIssueTypesIdState);
	return issueTypes.find((issueType) => issueType.id === activeId) || issueTypes[0] || null;
});
