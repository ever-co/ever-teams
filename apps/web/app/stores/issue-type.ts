import { IIssueTypesItemList } from '@app/interfaces/IIssueTypes';
import { atom, selector } from 'recoil';

export const issueTypesListState = atom<IIssueTypesItemList[]>({
	key: 'issueTypesListState',
	default: []
});

export const activeIssueTypesIdState = atom<string | null>({
	key: 'activeIssueTypesIdState',
	default: null
});

export const issueTypesFetchingState = atom<boolean>({
	key: 'issueTypesFetchingState',
	default: false
});

export const activeIssueTypesState = selector<IIssueTypesItemList | null>({
	key: 'activeIssueTypesState',
	get: ({ get }) => {
		const issueTypes = get(issueTypesListState);
		const activeId = get(activeIssueTypesIdState);
		return (
			issueTypes.find((issueType) => issueType.id === activeId) ||
			issueTypes[0] ||
			null
		);
	}
});
