import { atom } from 'jotai';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';

export const organizationTeamsState = atom<TOrganizationTeam[]>([]);

export const activeTeamIdState = atom<string | null, [string | null], void>(
	null,
	(get, set, newValue: string | null) => {
		const currentValue = get(activeTeamIdState);
		console.log('🔄 activeTeamIdState update:', {
			from: currentValue,
			to: newValue,
			stack: new Error().stack?.split('\n')[2]?.trim() // Show where it's called from
		});
		set(activeTeamIdState, newValue);
	}
);

export const teamsFetchingState = atom<boolean>(false);

export const isTeamMemberState = atom<boolean>(true);
export const isTeamManagerState = atom<boolean>(false);
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

		// 🎯 FIX: Only fallback to teams[0] if no activeId is set
		// This prevents switching to first team when activeId exists but teams aren't loaded yet
		if (activeId) {
			const foundTeam = teams.find((team) => team.id === activeId);
			console.log('🔍 activeTeamState getter:', {
				activeId,
				teamsCount: teams.length,
				foundTeam: foundTeam ? { id: foundTeam.id, name: foundTeam.name } : null,
				availableTeams: teams.map((t) => ({ id: t.id, name: t.name }))
			});
			return foundTeam || null;
		}

		// Only use first team as fallback when no specific team is selected
		const fallbackTeam = teams[0] || null;
		console.log('🔍 activeTeamState fallback:', {
			activeId: null,
			teamsCount: teams.length,
			fallbackTeam: fallbackTeam ? { id: fallbackTeam.id, name: fallbackTeam.name } : null
		});
		return fallbackTeam;
	},
	(get, set, update) => {
		const teams = get(organizationTeamsState);
		const activeId = get(activeTeamIdState);

		// 🎯 FIX: Consistent logic with getter - only fallback to teams[0] if no activeId
		const currentTeam = activeId ? teams.find((team) => team.id === activeId) : teams[0];

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
