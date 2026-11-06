'use client';

import { useAtomValue } from 'jotai';
import { isTeamMemberState, organizationTeamsState } from '@/core/stores/teams/organization-team';

/**
 * Whether the shell has published the user's teams, or the answer that there are none (`isTeamMemberState` turns
 * false when the list comes back empty). Until then a value derived from the teams (a team scope, a team name) is
 * not known yet, only pending.
 */
export function useAreTeamsSettled() {
	const teams = useAtomValue(organizationTeamsState);
	const isTeamMember = useAtomValue(isTeamMemberState);
	const hasTeams = teams.length > 0;
	const hasNoTeam = !isTeamMember;
	return hasTeams || hasNoTeam;
}
