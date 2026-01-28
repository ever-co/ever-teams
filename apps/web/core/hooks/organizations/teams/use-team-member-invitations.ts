import { teamInvitationsState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useCurrentTeam } from './use-current-team';
import { useMemo } from 'react';

/**
 * Returns pending invitations excluding users already in the team.
 *
 * @description
 * Filters team invitations to show only those for users who are NOT
 * already members of the active team. Prevents showing duplicate
 * invitations for existing members.
 *
 * Compares invitation emails against member employee user emails.
 *
 * @example
 * ```tsx
 * const pendingInvitations = useTeamMemberInvitation();
 *
 * return (
 *   <div>
 *     <h3>Pending Invitations ({pendingInvitations.length})</h3>
 *     {pendingInvitations.map((invite) => (
 *       <InvitationCard key={invite.id} invitation={invite} />
 *     ))}
 *   </div>
 * );
 * ```
 *
 * @see {@link teamInvitationsState} - Source atom for all invitations
 * @see {@link useCurrentTeam} - Active team with members list
 * @see {@link useGetTeamInvitationsQuery} - Query that populates the atom
 *
 * @returns Filtered array of `TInvite[]` excluding existing members
 */
export const useTeamMemberInvitation = () => {
	const invitations = useAtomValue(teamInvitationsState);
	const activeTeam = useCurrentTeam();
	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);

	return invitations.filter((invite) => {
		return !members.find((me: any) => me?.employee?.user?.email === invite?.email);
	});
};
