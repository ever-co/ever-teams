import { IOrganizationTeamList } from '@app/interfaces/IOrganizationTeam';
import { atom, selector } from 'recoil';

export const organizationTeamsState = atom<IOrganizationTeamList[]>({
	key: 'organizationTeamsState',
	default: [],
});

export const activeTeamIdState = atom<string | null>({
	key: 'activeTeamIdState',
	default: null,
});

export const teamsFetchingState = atom<boolean>({
	key: 'teamsFetchingState',
	default: false,
});

export const activeTeamState = selector<IOrganizationTeamList | null>({
	key: 'activeTeamState',
	get: ({ get }) => {
		const teams = get(organizationTeamsState);
		const activeId = get(activeTeamIdState);
		return teams.find((team) => team.id === activeId) || teams[0] || null;
	},
});
