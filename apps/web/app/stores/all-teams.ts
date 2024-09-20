import { ITeamsMembersFilter } from '@app/interfaces';
import { atom } from 'jotai';

export const filterValue = atom<ITeamsMembersFilter>({
  label: 'All',
  value: 'all',
  bg: 'transparent'
});
