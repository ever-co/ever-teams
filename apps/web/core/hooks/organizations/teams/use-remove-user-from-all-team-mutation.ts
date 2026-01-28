'use client';

import { queryKeys } from '@/core/query/keys';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthenticateUser } from '../../auth';
import { useLoadTeamsData } from './use-load-teams-data';

/**
 * Mutation hook to remove a user from ALL organization teams.
 *
 * @description
 * Removes the specified user from every team in the organization.
 * Handles critical auth side-effects in specific order:
 * 1. Reload teams data
 * 2. Refresh auth token (permissions changed)
 * 3. Update user data from API
 *
 * @example
 * ```tsx
 * const { mutate: removeUserFromAll, isPending } = useRemoveUserFromAllTeamMutation();
 *
 * const handleRemoveCompletely = (userId: string) => {
 *   removeUserFromAll(userId, {
 *     onSuccess: () => console.log('User removed from all teams'),
 *   });
 * };
 * ```
 *
 * @see {@link useLoadTeamsData} - Reloads teams after removal
 * @see {@link useAuthenticateUser} - Handles auth refresh sequence
 *
 * @returns TanStack mutation object with `mutate(userId: string)`
 */
export const useRemoveUserFromAllTeamMutation = () => {
	const queryClient = useQueryClient();
	const { refreshUserData, refreshToken } = useAuthenticateUser();

	const loadTeamsData = useLoadTeamsData();

	return useMutation({
		mutationFn: (userId: string) => {
			return organizationTeamService.removeUserFromAllTeams(userId);
		},
		mutationKey: queryKeys.organizationTeams.mutations.removeUser(null),
		onSuccess: async (response) => {
			// Service returns simple DeleteResponse, no complex validation needed
			// Just ensure response exists

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
			// Enhanced error handling
			toast.error('Remove user from all teams failed', {
				description: error.message
			});
			console.error('Remove user from all teams failed:', error);
			// Original error will be thrown and handled by calling code
		}
	});
};
