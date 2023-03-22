import { IInvitation, IMyInvitations } from '@app/interfaces/IInvite';
import { atom, selector } from 'recoil';
import { activeTeamState } from './organization-team';

export const teamInvitationsState = atom<IInvitation[]>({
	key: 'teamInvitationsState',
	default: [],
});

export const myInvitationsState = atom<IMyInvitations[]>({
	key: 'myInvitationsState',
	default: [],
});

export const getTeamInvitationsState = selector<IInvitation[]>({
	key: 'getTeamInvitationsState',
	get({ get }) {
		const invitations = get(teamInvitationsState);
		const activeTeam = get(activeTeamState);
		const members = activeTeam?.members || [];

		return invitations.filter((invite) => {
			return !members.find((me) => me?.employee?.user?.email === invite?.email);
		});
	},
});

export const fetchingTeamInvitationsState = atom<boolean>({
	key: 'fetchingTeamInvitationsState',
	default: false,
});
