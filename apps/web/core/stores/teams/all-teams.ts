import { ITeamsMembersFilter } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const filterValue = atom<ITeamsMembersFilter>({
	label: 'All',
	value: 'all',
	bg: 'transparent'
});
