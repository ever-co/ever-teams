import { IOrganizationTeam, IOrganizationTeamMember } from '@/core/types/interfaces/to-review/IOrganizationTeam';
import { RoleNameEnum } from '../types/enums/role';
import { atom } from 'jotai';

export const organizationTeamsState = atom<IOrganizationTeam[]>([]);

export const activeTeamIdState = atom<string | null>(null);

export const teamsFetchingState = atom<boolean>(false);

export const isTeamMemberState = atom<boolean>(true);

export const isTeamMemberJustDeletedState = atom<boolean>(false);

export const isTeamJustDeletedState = atom<boolean>(false);

export const isOTRefreshingState = atom<boolean>(false);
export const OTRefreshIntervalState = atom<number>();

export const activeTeamState = atom<IOrganizationTeam | null>((get) => {
	const teams = get(organizationTeamsState);
	const activeId = get(activeTeamIdState);
	return teams.find((team) => team.id === activeId) || teams[0] || null;
});
export const memberActiveTaskIdState = atom<string | null>(null);

export const publicactiveTeamState = atom<IOrganizationTeam | undefined>(undefined);

export const activeTeamManagersState = atom<IOrganizationTeamMember[]>((get) => {
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
});
