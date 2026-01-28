'use client';
import { setActiveProjectIdCookie } from '@/core/lib/helpers/cookies';

import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { queryKeys } from '@/core/query/keys';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import {
	activeTeamIdState,
	isTeamMemberJustDeletedState,
	isTeamMemberState,
	organizationTeamsState
} from '@/core/stores';
import { TOrganizationTeam } from '@/core/types/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';

/**
 * Builds a unique signature string from a list of teams.
 *
 * @description
 * Creates a deterministic signature based on all mutable team fields
 * to detect changes even when members are undefined.
 * Includes: id, updatedAt, name, settings, visual properties, members count, and member roles.
 *
 * @param teams - Array of organization teams
 * @returns Sorted, pipe-separated signature string
 */
const buildTeamListSignature = (teams: TOrganizationTeam[]) => {
	// CRITICAL FIX: Create a signature based on ALL mutable fields
	// This ensures we detect changes in team properties even when members are undefined
	// Includes: id, updatedAt, name, settings (shareProfileView, requirePlanToTrack, public),
	// visual properties (color, emoji, prefix), members count, AND member roles
	// NOTE: Including member roles is essential to detect when roles are loaded/changed
	return teams
		.map((t) => {
			// Include member role information to detect role changes
			const memberRolesSignature = t.members?.map((m) => `${m.id}:${m.role?.name ?? 'none'}`).join(',') || '';
			return `${t.id}:${t.updatedAt ?? ''}:${t.name}:${t.shareProfileView ?? ''}:${t.requirePlanToTrack ?? ''}:${t.public ?? ''}:${t.color ?? ''}:${t.emoji ?? ''}:${t.prefix ?? ''}:${t.members?.length ?? 0}:${memberRolesSignature}`;
		})
		.sort((a, b) => a.localeCompare(b))
		.join('|');
};
/**
 * Query hook for fetching all organization teams.
 *
 * @description
 * Fetches teams list and syncs with Jotai state for backward compatibility.
 * Handles edge case where user is removed from all teams.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetOrganizationTeamsQuery();
 * const teams = data?.data?.items ?? [];
 * ```
 *
 * @see {@link organizationTeamsState} - Jotai state synced on success
 * @see {@link useGetOrganizationTeamQuery} - Fetch single team details
 *
 * @returns TanStack query object with teams data
 */
export const useGetOrganizationTeamsQuery = () => {
	const { data: user } = useUserQuery();

	const setTeams = useSetAtom(organizationTeamsState);
	const setIsTeamMemberJustDeleted = useSetAtom(isTeamMemberJustDeletedState);
	const setIsTeamMember = useSetAtom(isTeamMemberState);

	const teamsQuery = useQuery({
		queryKey: queryKeys.organizationTeams.all,
		queryFn: async () => {
			return await organizationTeamService.getOrganizationTeams();
		},
		enabled: !!(user?.employee?.organizationId && user?.employee?.tenantId),
		staleTime: 1000 * 60 * 10, // PERFORMANCE FIX: Increased to 10 minutes to reduce refetching
		gcTime: 1000 * 60 * 30, // PERFORMANCE FIX: Increased to 30 minutes
		refetchOnWindowFocus: false, // PERFORMANCE FIX: Disable aggressive refetching
		refetchOnReconnect: false // PERFORMANCE FIX: Disable aggressive refetching
	});

	// ===== SYNCHRONIZATION WITH JOTAI (Backward Compatibility) =====
	// Sync organization teams data with Jotai state
	useEffect(() => {
		if (teamsQuery.data?.data?.items) {
			setTeams((currentTeams) => {
				const currentSignature = buildTeamListSignature(currentTeams);
				const updatedSignature = buildTeamListSignature(teamsQuery.data.data.items);

				return currentSignature == updatedSignature ? currentTeams : teamsQuery.data.data.items;
			});

			// Handle case where user might be removed from all teams
			if (teamsQuery.data?.data?.items.length === 0) {
				setIsTeamMember(false);
				setIsTeamMemberJustDeleted(true);
			}
		}
		// NOTE: Do NOT include teamsQuery.data in dependencies
		// It causes infinite loops because React Query returns new references
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teamsQuery.dataUpdatedAt, setTeams, setIsTeamMemberJustDeleted, setIsTeamMember]);

	return teamsQuery;
};

/**
 * Query hook for fetching the currently active organization team.
 *
 * @description
 * Fetches team details based on `activeTeamIdState` and syncs with Jotai.
 * Also sets the active project cookie if the team has projects.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetOrganizationTeamQuery();
 * const activeTeam = data?.data;
 * ```
 *
 * @see {@link activeTeamIdState} - Determines which team to fetch
 * @see {@link useCurrentTeam} - Simplified accessor for active team
 *
 * @returns TanStack query object with active team data
 */
export const useGetOrganizationTeamQuery = () => {
	const { data: user } = useUserQuery();

	const activeTeamId = useAtomValue(activeTeamIdState);
	const setTeams = useSetAtom(organizationTeamsState);

	const teamQuery = useQuery({
		queryKey: queryKeys.organizationTeams.detail(activeTeamId),
		queryFn: async () => {
			if (!activeTeamId) {
				throw new Error('Team ID is required');
			}
			return await organizationTeamService.getOrganizationTeam(activeTeamId);
		},
		enabled: !!(activeTeamId && user?.employee?.organizationId && user?.employee?.tenantId),
		staleTime: 1000 * 60 * 10, // PERFORMANCE FIX: Increased to 10 minutes
		gcTime: 1000 * 60 * 30, // PERFORMANCE FIX: Increased to 30 minutes
		refetchOnWindowFocus: false, // PERFORMANCE FIX: Disable aggressive refetching
		refetchOnReconnect: false // PERFORMANCE FIX: Disable aggressive refetching
	});

	// ===== SYNCHRONIZATION WITH JOTAI (Backward Compatibility) =====
	// Sync specific team data with Jotai state
	useEffect(() => {
		if (teamQuery.data?.data) {
			setTeams((currentTeams) => {
				const targetedTeam = currentTeams.find((team) => team?.id == teamQuery.data.data?.id);
				if (!targetedTeam) return [...currentTeams, teamQuery.data?.data];

				const currentSignature = buildTeamListSignature([targetedTeam]);
				const updatedSignature = buildTeamListSignature([teamQuery.data.data]);

				const updatedTeamList =
					currentSignature == updatedSignature
						? currentTeams
						: currentTeams.map((team) => (team.id == targetedTeam.id ? teamQuery.data.data : team));

				return updatedTeamList;
			});

			// Set Project Id to cookie
			if (teamQuery.data?.data?.projects?.length) {
				setActiveProjectIdCookie(teamQuery.data.data.projects[0].id);
			}
		}
		// NOTE: Do NOT include organizationTeamQuery.data in dependencies
		// It causes infinite loops because React Query returns new references
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teamQuery.dataUpdatedAt]);

	return teamQuery;
};

/**
 * Returns an imperative function to fetch a team by ID.
 *
 * @description
 * Uses `queryClient.fetchQuery` for on-demand fetching with caching.
 * Useful for mutations that need fresh team data after updates.
 *
 * @example
 * ```tsx
 * const getTeamById = useGetOrganizationTeamById();
 *
 * const handleUpdate = async (teamId: string) => {
 *   const { data } = await getTeamById(teamId);
 *   console.log(data.name);
 * };
 * ```
 *
 * @see {@link useEditOrganizationTeamMutation} - Uses this for post-edit refresh
 *
 * @returns Async function `(teamId: string) => Promise<TOrganizationTeam>`
 */
export const useGetOrganizationTeamById = () => {
	const queryClient = useQueryClient();

	const query = async (teamId: string) => {
		return queryClient.fetchQuery({
			queryKey: queryKeys.organizationTeams.detail(teamId),
			queryFn: () => organizationTeamService.getOrganizationTeam(teamId),
			staleTime: 1000 * 60 * 1,
			gcTime: 1000 * 60 * 30 // PERFORMANCE FIX: Increased to 30 minutes
		});
	};

	return query;
};
