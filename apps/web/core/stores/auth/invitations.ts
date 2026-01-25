import { useCurrentTeam } from '@/core/hooks/organizations/teams/use-current-team';
import { TInvite } from '@/core/types/schemas';
import { atom } from 'jotai';

export const teamInvitationsState = atom<TInvite[]>([]);

export const myInvitationsState = atom<TInvite[]>([]);

/**
 * Keep for backward compatibility
 * @deprecated use `useTeamMemberInvitation()` hooks, that is partialy in sync with tanstack
 */
export const getTeamInvitationsState = atom<TInvite[]>((get) => {
	const invitations = get(teamInvitationsState);
	const activeTeam = useCurrentTeam();
	const members = activeTeam?.members || [];

	return invitations.filter((invite) => {
		return !members.find((me: any) => me?.employee?.user?.email === invite?.email);
	});
});

export const fetchingTeamInvitationsState = atom<boolean>(false);
