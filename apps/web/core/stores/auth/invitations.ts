import { IInvitation, IMyInvitations } from '@/core/types/interfaces/to-review/IInvite';
import { atom } from 'jotai';
import { activeTeamState } from '../teams/organization-team';

export const teamInvitationsState = atom<IInvitation[]>([]);

export const myInvitationsState = atom<IMyInvitations[]>([]);

export const getTeamInvitationsState = atom<IInvitation[]>((get) => {
	const invitations = get(teamInvitationsState);
	const activeTeam = get(activeTeamState);
	const members = activeTeam?.members || [];

	return invitations.filter((invite) => {
		return !members.find((me) => me?.employee?.user?.email === invite?.email);
	});
});

export const fetchingTeamInvitationsState = atom<boolean>(false);
