'use client';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';

import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { queryKeys } from '@/core/query/keys';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { activeTeamIdState, isTeamMemberJustDeletedState, isTeamMemberState } from '@/core/stores';
import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { useSetActiveTeam } from './use-set-active-team';

/**
 * Returns an imperative function to load and initialize teams data.
 *
 * @description
 * Handles the full team selection priority logic on app initialization:
 * 1. Cookie (current session)
 * 2. localStorage (user's last selected team)
 * 3. User's `lastTeamId` from server
 *
 * Also handles edge cases where user was removed from their selected team.
 *
 * @example
 * ```tsx
 * const loadTeamsData = useLoadTeamsData();
 *
 * useEffect(() => {
 *   loadTeamsData().then(() => console.log('Teams loaded'));
 * }, [loadTeamsData]);
 * ```
 *
 * @see {@link useSetActiveTeam} - Sets the active team with persistence
 * @see {@link activeTeamIdState} - Jotai state for active team ID
 * @see {@link isTeamMemberJustDeletedState} - Flags when user lost team access
 *
 * @returns Async function `() => Promise<TeamsResult | undefined>`
 */
export const useLoadTeamsData = () => {
	const { data: user } = useUserQuery();
	const setActiveTeamId = useSetAtom(activeTeamIdState);
	const setIsTeamMemberJustDeleted = useSetAtom(isTeamMemberJustDeletedState);
	const setIsTeamMember = useSetAtom(isTeamMemberState);
	const setActiveTeam = useSetActiveTeam();

	const queryClient = useQueryClient();

	const loadTeamsData = useCallback(async () => {
		if (!user?.employee?.organizationId || !user?.employee?.tenantId) {
			return;
		}

		// TEAM SELECTION PRIORITY LOGIC
		// 1. Try cookie first (current session)
		let teamId = getActiveTeamIdCookie();

		// 2. Fallback to localStorage (user's last selected team)
		if (!teamId && typeof window !== 'undefined') {
			teamId = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM) || '';
		}

		// 3. Fallback to user's last team from server
		if (!teamId && user?.lastTeamId) {
			teamId = user.lastTeamId;
		}

		setActiveTeamId(teamId);

		try {
			// Trigger React Query refetch for teams
			const teamsResult = await queryClient.fetchQuery({
				queryKey: queryKeys.organizationTeams.all,
				queryFn: async () => {
					return await organizationTeamService.getOrganizationTeams();
				}
			});

			const latestTeams = teamsResult.data?.items || [];

			if (latestTeams.length === 0) {
				setIsTeamMember(false);
				setIsTeamMemberJustDeleted(true);
			}

			// Handle case where user might be removed from selected team
			const selectedTeamExists = latestTeams.find((team: any) => team.id === teamId);

			if (!selectedTeamExists && teamId && latestTeams.length) {
				setIsTeamMemberJustDeleted(true);
				// Only fallback to first team if the selected team truly doesn't exist
				setActiveTeam(latestTeams[0]);
			} else if (!latestTeams.length) {
				teamId = '';
			}

			// Fetch specific team details if teamId exists
			if (teamId) {
				await queryClient.fetchQuery({
					queryKey: queryKeys.organizationTeams.detail(teamId),
					queryFn: async () => {
						return await organizationTeamService.getOrganizationTeam(teamId);
					}
				});
			}

			return teamsResult;
		} catch (error) {
			console.error('Error loading teams data:', error);
			throw error;
		}
	}, [
		queryClient,
		user?.employee?.organizationId,
		user?.employee?.tenantId,
		setActiveTeamId,
		setIsTeamMember,
		setIsTeamMemberJustDeleted,
		setActiveTeam
	]);

	return loadTeamsData;
};
