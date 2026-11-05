'use client';
import { organizationTeamsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import isEqual from 'lodash/isEqual';
import { useSyncRef } from '../../common/use-sync-ref';
import { TOrganizationTeam } from '@/core/types/schemas';
import { mergePreservingOrder } from '@/core/lib/utils/team-members.utils';

/**
 * setTeamsUpdate alone, for the mutation hooks: they only write the teams, and reading them would re-render their
 * component (one per member row for the role actions) on every refresh of the teams.
 */
export function useSetTeamsUpdate() {
	const setTeams = useSetAtom(organizationTeamsState);

	return useCallback(
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
				// NOTE: This may keep stale members if a team legitimately has 0 members,
				// but this is an acceptable trade-off since teams always have at least a creator
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

				// Nothing changed: returning the same array lets Jotai skip notifying every team reader
				if (isEqual(mergedTeam, existingTeam)) {
					return tms;
				}

				return tms.map((t) => (t.id === team.id ? mergedTeam : t));
			});
		},
		[setTeams]
	);
}

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
	const setTeamsUpdate = useSetTeamsUpdate();

	return {
		teams,
		setTeams,
		setTeamsUpdate,
		teamsRef
	};
}
