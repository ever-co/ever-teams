'use client';

import {
	getActiveTeamIdCookie,
	setActiveProjectIdCookie,
	setActiveTeamIdCookie,
	setOrganizationIdCookie
} from '@/core/lib/helpers/cookies';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	activeTeamIdState,
	activeTeamState,
	activeTeamTaskState,
	isTeamMemberJustDeletedState,
	isTeamMemberState,
	organizationTeamsState,
	teamTasksState
} from '@/core/stores';
import { useCallback, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useFirstLoad, useSyncRef } from '../../common';
import { useTeamsState } from './use-teams-state';
import { mergePreservingOrder } from '@/core/lib/utils/team-members.utils';
import { queryKeys } from '@/core/query/keys';
import { useSettings } from '../../users';
import { TOrganizationTeam } from '@/core/types/schemas';

/**
 * Hook for read-only organization teams operations.
 * Provides teams data fetching, loading states, and Jotai synchronization.
 *
 * @returns {Object} An object containing:
 * - `getOrganizationTeamsLoading` - Loading state for teams list query
 * - `loadingTeam` - Loading state for single team query
 * - `teamsFetching` - Fetching state for teams query
 * - `loadTeamsData` - Function to load/refresh teams data
 * - `firstLoadTeamsData` - First load handler with team selection logic
 * - `teams` - Array of organization teams (from Jotai)
 * - `activeTeam` - Currently active team (from Jotai)
 */
export function useOrganizationTeamsQuery() {
	const queryClient = useQueryClient();
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);
	const activeTeam = useAtomValue(activeTeamState);

	const { setTeamsUpdate } = useTeamsState();
	const { data: user } = useUserQuery();
	const { updateAvatar: updateUserLastTeam } = useSettings();

	const [activeTeamId, setActiveTeamId] = useAtom(activeTeamIdState);
	const [isTeamMemberJustDeleted, setIsTeamMemberJustDeleted] = useAtom(isTeamMemberJustDeletedState);
	const { firstLoadData: firstLoadTeamsDataInternal } = useFirstLoad();
	const setIsTeamMember = useSetAtom(isTeamMemberState);
	const setActiveTeamTask = useSetAtom(activeTeamTaskState);
	const setTeamTasks = useSetAtom(teamTasksState);

	// ==================== SET ACTIVE TEAM (inlined to avoid circular dependency) ====================

	const setActiveTeam = useCallback(
		(team: TOrganizationTeam) => {
			// NOTE: Reset both tasks array AND active task state when switching teams
			// This prevents stale data from previous team persisting during the transition
			// New tasks will be loaded by the effect that watches activeTeam?.id
			setTeamTasks([]);
			setActiveTeamTask(null);

			setActiveTeamIdCookie(team?.id);
			setOrganizationIdCookie(team?.organizationId || '');

			if (team && team?.projects && team.projects.length) {
				setActiveProjectIdCookie(team.projects[0].id);
			}
			if (globalThis.window !== undefined) {
				globalThis.window.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, team.id);
			}
			if (user && user.lastTeamId !== team.id) {
				updateUserLastTeam({ id: user.id, lastTeamId: team.id });
			}

			setActiveTeamId(team?.id);
		},
		[setActiveTeamId, setActiveTeamTask, setTeamTasks, updateUserLastTeam, user]
	);

	// ==================== QUERIES ====================

	// Query for organization teams list
	const organizationTeamsQuery = useQuery({
		queryKey: queryKeys.organizationTeams.all,
		queryFn: async () => {
			return await organizationTeamService.getOrganizationTeams();
		},
		enabled: !!(user?.employee?.organizationId && user?.employee?.tenantId),
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});

	// Query for specific team details
	const organizationTeamQuery = useQuery({
		queryKey: queryKeys.organizationTeams.detail(activeTeamId),
		queryFn: async () => {
			if (!activeTeamId) {
				throw new Error('Team ID is required');
			}
			return await organizationTeamService.getOrganizationTeam(activeTeamId);
		},
		enabled: !!(activeTeamId && user?.employee?.organizationId && user?.employee?.tenantId),
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});

	// ==================== JOTAI SYNCHRONIZATION ====================

	// Sync organization teams data with Jotai state
	const lastProcessedTeamsSignatureRef = useRef<string>('');

	useEffect(() => {
		if (organizationTeamsQuery.data?.data?.items) {
			const latestTeams = organizationTeamsQuery.data.data.items;

			// Create a signature based on ALL mutable fields
			const latestSignature = latestTeams
				.map((t) => {
					const memberRolesSignature =
						t.members?.map((m) => `${m.id}:${m.role?.name ?? 'none'}`).join(',') || '';
					return `${t.id}:${t.updatedAt ?? ''}:${t.name}:${t.shareProfileView ?? ''}:${t.requirePlanToTrack ?? ''}:${t.public ?? ''}:${t.color ?? ''}:${t.emoji ?? ''}:${t.prefix ?? ''}:${t.members?.length ?? 0}:${memberRolesSignature}`;
				})
				.sort()
				.join('|');

			if (latestSignature === lastProcessedTeamsSignatureRef.current) {
				return;
			}

			lastProcessedTeamsSignatureRef.current = latestSignature;

			const currentTeams = teamsRef.current;

			// Merge teams intelligently to preserve members
			const mergedTeams = latestTeams.map((latestTeam) => {
				const existingTeam = currentTeams.find((t) => t.id === latestTeam.id);

				if (!existingTeam) {
					return latestTeam;
				}

				const existingHasMembers = existingTeam.members && existingTeam.members.length > 0;
				const newHasMembers = Array.isArray(latestTeam.members) && latestTeam.members.length > 0;

				const shouldPreserveMembers =
					!Array.isArray(latestTeam.members) || (latestTeam.members.length === 0 && existingHasMembers);

				let finalMembers = existingTeam.members ?? [];
				if (!shouldPreserveMembers && newHasMembers && latestTeam.members) {
					finalMembers = mergePreservingOrder(existingTeam.members ?? [], latestTeam.members);
				}

				return {
					...existingTeam,
					...latestTeam,
					members: finalMembers
				};
			});

			setTeams(mergedTeams);

			if (latestTeams.length === 0) {
				setIsTeamMember(false);
				setIsTeamMemberJustDeleted(true);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [organizationTeamsQuery.dataUpdatedAt, setTeams, setIsTeamMember, setIsTeamMemberJustDeleted]);

	// Sync specific team data with Jotai state
	const lastProcessedTeamSignatureRef = useRef<string>('');

	useEffect(() => {
		if (organizationTeamQuery.data?.data) {
			const newTeam = organizationTeamQuery.data.data;

			const memberActiveTaskIds = newTeam.members?.map((m) => m.activeTaskId || 'null').join(',') || '';
			const memberRoles = newTeam.members?.map((m) => `${m.id}:${m.role?.name ?? 'none'}`).join(',') || '';
			const newSignature = `${newTeam.id}:${newTeam.updatedAt ?? ''}:${newTeam.members?.length ?? 0}:${memberActiveTaskIds}:${memberRoles}`;

			if (newSignature === lastProcessedTeamSignatureRef.current) {
				return;
			}

			lastProcessedTeamSignatureRef.current = newSignature;

			setTeamsUpdate(newTeam);

			if (newTeam && newTeam.projects && newTeam.projects.length) {
				setActiveProjectIdCookie(newTeam.projects[0].id);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [organizationTeamQuery.dataUpdatedAt, setTeamsUpdate, activeTeam]);

	// ==================== QUERY FUNCTIONS ====================

	const loadTeamsData = useCallback(async () => {
		if (!user?.employee?.organizationId || !user?.employee?.tenantId) {
			return;
		}

		// TEAM SELECTION PRIORITY LOGIC
		let teamId = getActiveTeamIdCookie();

		if (!teamId && typeof window !== 'undefined') {
			teamId = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM) || '';
		}

		if (!teamId && user?.lastTeamId) {
			teamId = user.lastTeamId;
		}

		setActiveTeamId(teamId);

		try {
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

			const selectedTeamExists = latestTeams.find((team: any) => team.id === teamId);

			if (!selectedTeamExists && teamId && latestTeams.length) {
				setIsTeamMemberJustDeleted(true);
				setActiveTeam(latestTeams[0]);
				// NOTE: Update local teamId to match the new active team
				// This prevents fetching details for the removed team
				teamId = latestTeams[0].id;
			} else if (!latestTeams.length) {
				teamId = '';
			}

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
		user?.lastTeamId,
		setActiveTeamId,
		setIsTeamMember,
		setIsTeamMemberJustDeleted,
		setActiveTeam
	]);

	const handleFirstLoad = useCallback(async () => {
		await loadTeamsData();

		if (activeTeamId) {
			try {
				const res = await organizationTeamService.getOrganizationTeam(activeTeamId);
				if (res) {
					setTeamsUpdate(res.data);
				}
			} catch (error) {
				console.error('Error loading team details:', error);
			}
		}

		firstLoadTeamsDataInternal();
	}, [activeTeamId, firstLoadTeamsDataInternal, loadTeamsData, setTeamsUpdate]);

	return {
		// Query states
		getOrganizationTeamsLoading: organizationTeamsQuery.isLoading,
		loadingTeam: organizationTeamQuery.isLoading,
		teamsFetching: organizationTeamsQuery.isFetching,

		// Data from Jotai (for backward compatibility)
		teams,
		activeTeam,

		// Query functions
		loadTeamsData,
		firstLoadTeamsData: handleFirstLoad,

		// Internal state (for backward compatibility)
		isTeamMemberJustDeleted,
		setIsTeamMemberJustDeleted
	};
}
