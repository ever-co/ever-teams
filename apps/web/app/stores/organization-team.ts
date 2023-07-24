import {
	IOrganizationTeamList,
	OT_Member,
	RoleNameEnum,
} from '@app/interfaces/IOrganizationTeam';
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

export const isTeamMemberState = atom<boolean>({
	key: 'isTeamMember',
	default: true,
});

export const isOTRefreshingState = atom<boolean>({
	key: 'isOTRefreshing',
	default: false,
});
export const OTRefreshIntervalState = atom<number>({
	key: 'OTRefreshInterval',
	default: undefined,
});

export const activeTeamState = selector<IOrganizationTeamList | null>({
	key: 'activeTeamState',
	get: ({ get }) => {
		const teams = get(organizationTeamsState);
		const activeId = get(activeTeamIdState);
		return teams.find((team) => team.id === activeId) || teams[0] || null;
	},
});
export const memberActiveTaskIdState = atom<string | null>({
	key: 'memberActiveTaskIdState',
	default: null,
});

export const publicactiveTeamState = atom<IOrganizationTeamList | undefined>({
	key: 'publicactiveTeamState',
	default: undefined,
});

export const activeTeamManagersState = selector<OT_Member[]>({
	key: 'activeTeamManagersState',
	get: ({ get }) => {
		const activeTeam = get(activeTeamState);
		const members = activeTeam?.members;
		return (
			members?.filter(
				(member) =>
					member?.role?.name === RoleNameEnum.MANAGER ||
					member?.role?.name === RoleNameEnum.SUPER_ADMIN ||
					member?.role?.name === RoleNameEnum.ADMIN
			) || []
		);
	},
});
