import { atom } from 'jotai';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';

export const organizationTeamsState = atom<TOrganizationTeam[]>([]);

export const activeTeamIdState = atom<string | null>(null);

export const teamsFetchingState = atom<boolean>(false);

export const isTeamMemberState = atom<boolean>(true);

export const isTeamMemberJustDeletedState = atom<boolean>(false);

export const isTeamJustDeletedState = atom<boolean>(false);

export const isOTRefreshingState = atom<boolean>(false);
export const OTRefreshIntervalState = atom<number>();

export const activeTeamState = atom<
	TOrganizationTeam | null,
	[((prev: TOrganizationTeam) => TOrganizationTeam) | TOrganizationTeam],
	void
>(
	(get) => {
		const teams = get(organizationTeamsState);
		const activeId = get(activeTeamIdState);
		return teams.find((team) => team.id === activeId) || teams[0] || null;
	},
	(get, set, update) => {
		const teams = get(organizationTeamsState);
		const activeId = get(activeTeamIdState);
		const currentTeam = teams.find((team) => team.id === activeId) || teams[0];

		if (!currentTeam) return;

		const updatedTeam =
			typeof update === 'function'
				? (update as (prev: TOrganizationTeam) => TOrganizationTeam)(currentTeam)
				: update;

		const updatedTeams = teams.map((team) => (team.id === currentTeam.id ? updatedTeam : team));

		set(organizationTeamsState, updatedTeams);
	}
);

export const memberActiveTaskIdState = atom<string | null>(null);

export const publicActiveTeamState = atom<TOrganizationTeam | undefined>(undefined);

export const activeTeamManagersState = atom<TOrganizationTeamEmployee[]>((get) => {
	const activeTeam = get(activeTeamState);
	const members = activeTeam?.members;
	return (
		members?.filter(
			(member) =>
				member?.role?.name === ERoleName.MANAGER ||
				member?.role?.name === ERoleName.SUPER_ADMIN ||
				member?.role?.name === ERoleName.ADMIN
		) || []
	);
});
