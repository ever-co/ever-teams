'use client';
import { organizationTeamsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useSyncRef } from '../../common';
import { TOrganizationTeam } from '@/core/types/schemas';

/**
 * It updates the `teams` state with the `members` status from the `team` status API
 * @returns An object with three properties:
 * teams: The current value of the teams state.
 * setTeams: A function that can be used to update the teams state.
 * setTeamUpdate: A function that can be used to update the teams state.
 */
export function useTeamsState() {
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);

	const setTeamsUpdate = useCallback(
		(team: TOrganizationTeam) => {
			// Update active teams fields with from team Status API
			setTeams((tms) => {
				const existingTeam = tms.find((t) => t.id === team.id);

				// If team doesn't exist, just add it
				if (!existingTeam) {
					return [...tms, team];
				}

				// Merge strategy: preserve members if new data has incomplete members
				// This prevents data loss during polling/refetching when API returns partial data
				const mergedTeam: TOrganizationTeam = {
					...existingTeam, // Start with existing data
					...team, // Override with new data
					// Preserve members only if new members is undefined/null (incomplete data)
					// If members is an array (even empty []), use it (complete data)
					// This protects against race conditions during React Query refetching
					members: Array.isArray(team.members) ? team.members : existingTeam.members || []
				};

				return tms.map((t) => (t.id === team.id ? mergedTeam : t));
			});
		},
		[setTeams]
	);

	return {
		teams,
		setTeams,
		setTeamsUpdate,
		teamsRef
	};
}
