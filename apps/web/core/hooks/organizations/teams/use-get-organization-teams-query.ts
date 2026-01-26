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
