'use client';
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { TOrganizationTeam, TOrganizationTeamEmployeeUpdate } from '@/core/types/schemas';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { queryKeys } from '@/core/query/keys';
import { useTeamsState } from './use-teams-state';
import { toast } from 'sonner';

/**
 * Hook for updating an organization team with full validation and cache management.
 *
 * @returns {Object} An object containing:
 * - updateOrganizationTeam: A function to update a team with optional data
 * - loading: A boolean indicating the mutation's pending state
 */

export function useUpdateOrganizationTeam() {
	const queryClient = useQueryClient();
	const { setTeamsUpdate } = useTeamsState();

	// React Query mutation with full validation and cache management
	const updateOrganizationTeamMutation = useMutation({
		mutationFn: ({ teamId, data }: { teamId: string; data: Partial<TOrganizationTeamEmployeeUpdate> }) => {
			return organizationTeamService.updateOrganizationTeam(teamId, data);
		},
		mutationKey: queryKeys.organizationTeams.mutations.update(null),
		onSuccess: (response) => {
			const data = response.data;
			// Preserve backward compatibility - exact same behavior
			setTeamsUpdate(data);

			// Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			// Enhanced error handling with Zod validation errors
			if (error instanceof ZodValidationError) {
				toast.error('Update team validation failed:', {
					description: JSON.stringify({
						message: error.message,
						issues: error.issues
					})
				});
				console.error('Update team validation failed:', {
					message: error.message,
					issues: error.issues
				});
				return;
			}

			toast.error('Update team validation failed');
		}
	});

	// Preserve exact same interface and logic as original
	const updateOrganizationTeam = useCallback(
		(team: TOrganizationTeam, data: Partial<TOrganizationTeamEmployeeUpdate> = {}) => {
			// Use React Query mutation instead of legacy queryCall
			updateOrganizationTeamMutation.mutate({
				teamId: team.id,
				data: {
					...team,
					...data
				}
			});
		},
		[updateOrganizationTeamMutation]
	);

	return {
		updateOrganizationTeam,
		loading: updateOrganizationTeamMutation.isPending // Map to legacy loading interface
	};
}
