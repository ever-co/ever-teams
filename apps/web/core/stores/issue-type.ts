import { IIssueTypesItemList } from '@/core/types/interfaces/IIssueTypes';
import { atom } from 'jotai';

export const issueTypesListState = atom<IIssueTypesItemList[]>([]);

export const activeIssueTypesIdState = atom<string | null>(null);

export const issueTypesFetchingState = atom<boolean>(false);

export const activeIssueTypesState = atom<IIssueTypesItemList | null>((get) => {
	const issueTypes = get(issueTypesListState);
	const activeId = get(activeIssueTypesIdState);
	return issueTypes.find((issueType) => issueType.id === activeId) || issueTypes[0] || null;
});
