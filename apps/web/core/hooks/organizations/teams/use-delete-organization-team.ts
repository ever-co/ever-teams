'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { useAuthenticateUser } from '../../auth';
import { useOrganizationTeamsQuery } from './use-organization-teams-query';

/**
 * Hook for organization team deletion operations.
 * Handles team deletion and user removal from all teams with proper cleanup.
 *
 * @returns {Object} An object containing:
 * - `deleteOrganizationTeam` - Function to delete a team
 * - `deleteOrganizationTeamLoading` - Loading state for team deletion
 * - `removeUserFromAllTeam` - Function to remove a user from all teams
 * - `removeUserFromAllTeamLoading` - Loading state for user removal
 */
export function useDeleteOrganizationTeam() {
	const queryClient = useQueryClient();
	const { logOut, refreshToken, refreshUserData } = useAuthenticateUser();
	const { loadTeamsData } = useOrganizationTeamsQuery();

	const deleteOrganizationTeamTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const clearDeleteTimeout = useCallback(() => {
		if (deleteOrganizationTeamTimeoutRef.current) {
			clearTimeout(deleteOrganizationTeamTimeoutRef.current);
			deleteOrganizationTeamTimeoutRef.current = null;
		}
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			clearDeleteTimeout();
		};
	}, [clearDeleteTimeout]);

	// ==================== DELETE TEAM MUTATION ====================

	const deleteOrganizationTeamMutation = useMutation({
		mutationFn: (id: string) => {
			return organizationTeamService.deleteOrganizationTeam(id);
		},
		mutationKey: queryKeys.organizationTeams.mutations.delete(null),
		onSuccess: async (response) => {
			toast.success('Team deleted successfully', {
				description: `Team "${response.data.name}" has been deleted. You will be logged out of the application to choose a new workspace.`
			});

			// Clear previous timeout if any
			clearDeleteTimeout();

			// Set a new timeout to logout after deletion
			deleteOrganizationTeamTimeoutRef.current = setTimeout(() => {
				logOut();

				queryClient.invalidateQueries({
					queryKey: queryKeys.organizationTeams.all
				});

				deleteOrganizationTeamTimeoutRef.current = null;
			}, 3000);
		},
		onError: (error) => {
			if (error instanceof ZodValidationError) {
				toast.error('Delete team validation failed', {
					description: JSON.stringify({
						message: error.message,
						issues: error.issues
					})
				});
				console.error('Delete team validation failed:', {
					message: error.message,
					issues: error.issues
				});
				return;
			}
			toast.error('Delete team failed');
		}
	});

	// ==================== REMOVE USER FROM ALL TEAMS MUTATION ====================

	const removeUserFromAllTeamMutation = useMutation({
		mutationFn: (userId: string) => {
			return organizationTeamService.removeUserFromAllTeams(userId);
		},
		mutationKey: queryKeys.organizationTeams.mutations.removeUser(null),
		onSuccess: async () => {
			// Preserve ALL critical side-effects in exact order
			// 1. First: Reload teams data
			await loadTeamsData();

			// 2. Then: Critical auth refresh sequence
			try {
				await refreshToken();
				// 3. Finally: Update user data from API
				refreshUserData();
			} catch (error) {
				toast.error('Failed to refresh token after removing user from team');
				console.error('Failed to refresh token after removing user from team:', error);
			}

			// Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			toast.error('Remove user from all teams failed', {
				description: error.message
			});
			console.error('Remove user from all teams failed:', error);
		}
	});

	// ==================== EXPORTED FUNCTIONS ====================

	const deleteOrganizationTeam = useCallback(
		(id: string) => {
			return deleteOrganizationTeamMutation.mutateAsync(id);
		},
		[deleteOrganizationTeamMutation]
	);

	const removeUserFromAllTeam = useCallback(
		(userId: string) => {
			return removeUserFromAllTeamMutation.mutateAsync(userId);
		},
		[removeUserFromAllTeamMutation]
	);

	return {
		deleteOrganizationTeam,
		deleteOrganizationTeamLoading: deleteOrganizationTeamMutation.isPending,
		removeUserFromAllTeam,
		removeUserFromAllTeamLoading: removeUserFromAllTeamMutation.isPending
	};
}
