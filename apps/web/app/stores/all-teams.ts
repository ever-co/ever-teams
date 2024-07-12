import { ITeamsMembersFilter } from '@app/interfaces';
import { atom } from 'recoil';

export const filterValue = atom<ITeamsMembersFilter>({
	key: 'allTeamsFilterValue',
	default: { label: 'All', value: 'all', bg: 'transparent' }
});
