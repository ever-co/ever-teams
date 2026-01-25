import { teamInvitationsState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useCurrentTeam } from './use-current-team';
import { useMemo } from 'react';

export const useTeamMemberInvitation = () => {
	const invitations = useAtomValue(teamInvitationsState);
	const activeTeam = useCurrentTeam();
	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);

	return invitations.filter((invite) => {
		return !members.find((me: any) => me?.employee?.user?.email === invite?.email);
	});
};
