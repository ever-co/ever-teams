'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { TOrganizationTeamUpdate } from '@/core/types/schemas';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { queryKeys } from '@/core/query/keys';
import { useTeamsState } from './use-teams-state';
import { toast } from 'sonner';

/**
 * Hook for editing organization team properties.
 * Handles team updates with proper cache management.
 *
 * @returns {Object} An object containing:
 * - `editOrganizationTeam` - Function to edit team properties
 * - `editOrganizationTeamLoading` - Loading state for edit operation
 */
export function useEditOrganizationTeam() {
	const queryClient = useQueryClient();
	const { setTeamsUpdate } = useTeamsState();

	// ==================== EDIT TEAM MUTATION ====================

	const editOrganizationTeamMutation = useMutation({
		mutationFn: (data: Partial<TOrganizationTeamUpdate>) => {
			return organizationTeamService.editOrganizationTeam(data);
		},
		mutationKey: queryKeys.organizationTeams.mutations.edit(null),
		onSuccess: (response) => {
			// Update Jotai state for backward compatibility
			setTeamsUpdate(response.data);

			// Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			if (error instanceof ZodValidationError) {
				toast.error('Edit team validation failed:', {
					description: JSON.stringify({
						message: error.message,
						issues: error.issues
					})
				});
				console.error('Edit team validation failed:', {
					message: error.message,
					issues: error.issues
				});
				return;
			}
			toast.error('Edit team failed');
		}
	});

	// ==================== EXPORTED FUNCTION ====================

	const editOrganizationTeam = useCallback(
		(data: Partial<TOrganizationTeamUpdate>) => {
			return editOrganizationTeamMutation.mutateAsync(data);
		},
		[editOrganizationTeamMutation]
	);

	return {
		editOrganizationTeam,
		editOrganizationTeamLoading: editOrganizationTeamMutation.isPending
	};
}
