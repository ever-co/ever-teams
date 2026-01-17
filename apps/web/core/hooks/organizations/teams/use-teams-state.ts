'use client';
import { organizationTeamsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useSyncRef } from '../../common';
import { TOrganizationTeam } from '@/core/types/schemas';
import { mergePreservingOrder } from '@/core/lib/utils/team-members.utils';

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
				// FIX: Also protect against race conditions where API returns empty array
				// while existing data has valid members
				const existingHasMembers = existingTeam.members && existingTeam.members.length > 0;
				const newHasMembers = Array.isArray(team.members) && team.members.length > 0;

				// Preserve members if:
				// 1. new members is undefined/null (incomplete data), OR
				// 2. new members is empty BUT existing has members (race condition protection)
				const shouldPreserveMembers =
					!Array.isArray(team.members) || (team.members.length === 0 && existingHasMembers);

				// Determine final members to use
				let finalMembers = existingTeam.members ?? [];
				if (!shouldPreserveMembers && newHasMembers && team.members) {
					// NOTE: Merge preserving order to prevent visual glitches during role changes
					// This ensures members stay in their positions while their data (including roles) is updated
					finalMembers = mergePreservingOrder(existingTeam.members ?? [], team.members);
				}

				const mergedTeam: TOrganizationTeam = {
					...existingTeam, // Start with existing data
					...team, // Override with new data
					// Intelligently preserve members during race conditions
					members: finalMembers
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
