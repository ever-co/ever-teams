'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { membersByIdOf, teamMembersOf } from '@/core/lib/utils/dashboards/manual-time-edits';

/**
 * Names the members a history speaks of (who made a change, whose entry it was): the active team's members, then the
 * names the page already knows. `null` for anyone else, so the change is told without a name.
 */
export function useHistoryMemberNames(knownNames?: ReadonlyMap<string, string>) {
	const activeTeam = useAtomValue(activeTeamState);
	const teamMembers = activeTeam?.members;
	const membersById = useMemo(() => membersByIdOf(teamMembersOf(teamMembers)), [teamMembers]);
	return useCallback(
		(employeeId: string) => {
			const teamName = membersById.get(employeeId)?.name;
			if (teamName) {
				return teamName;
			}
			return knownNames?.get(employeeId) ?? null;
		},
		[knownNames, membersById]
	);
}
