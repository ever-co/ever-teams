import { atom } from 'jotai';
import { ITeamsMembersFilter } from '@/core/components/pages/teams/all-teams/all-teams-members-views/all-team-members-filter';

export const filterValue = atom<ITeamsMembersFilter>({
	label: 'All',
	value: 'all',
	bg: 'transparent'
});
