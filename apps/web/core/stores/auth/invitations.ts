import { atom } from 'jotai';
import { activeTeamState } from '../teams/organization-team';
import { TInvite } from '@/core/types/schemas';

export const teamInvitationsState = atom<TInvite[]>([]);

export const myInvitationsState = atom<TInvite[]>([]);

export const getTeamInvitationsState = atom<TInvite[]>((get) => {
	const invitations = get(teamInvitationsState);
	const activeTeam = get(activeTeamState);
	const members = activeTeam?.members || [];

	return invitations.filter((invite) => {
		return !members.find((me: any) => me?.employee?.user?.email === invite?.email);
	});
});

export const fetchingTeamInvitationsState = atom<boolean>(false);
