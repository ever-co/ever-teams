import { ITeamsMemebersFilter } from '@app/interfaces';
import { atom } from 'recoil';

export const filterValue = atom<ITeamsMemebersFilter>({
	key: 'allTeamsFilterValue',
	default: { label: 'All', value: 'all', bg: 'transparent' }
});
