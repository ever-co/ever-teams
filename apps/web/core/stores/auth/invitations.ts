import { IInvite, IInvite } from '@/core/types/interfaces/to-review/IInvite';
import { atom } from 'jotai';
import { activeTeamState } from '../teams/organization-team';

export const teamInvitationsState = atom<IInvite[]>([]);

export const myInvitationsState = atom<IInvite[]>([]);

export const getTeamInvitationsState = atom<IInvite[]>((get) => {
	const invitations = get(teamInvitationsState);
	const activeTeam = get(activeTeamState);
	const members = activeTeam?.members || [];

	return invitations.filter((invite) => {
		return !members.find((me) => me?.employee?.user?.email === invite?.email);
	});
});

export const fetchingTeamInvitationsState = atom<boolean>(false);
