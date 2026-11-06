'use client';
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { TOrganizationTeam, TOrganizationTeamUpdate } from '@/core/types/schemas';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { queryKeys } from '@/core/query/keys';
import { useSetTeamsUpdate } from './use-teams-state';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';

/**
 * Hook for updating an organization team with full validation and cache management.
 *
 * @returns {Object} An object containing:
 * - updateOrganizationTeam: A function to update a team with optional data
 * - loading: A boolean indicating the mutation's pending state
 */

export function useUpdateOrganizationTeam() {
	const queryClient = useQueryClient();
	const setTeamsUpdate = useSetTeamsUpdate();
	const t = useTranslations();

	// React Query mutation with full validation and cache management
	const updateOrganizationTeamMutation = useMutation({
		mutationFn: ({ teamId, data }: { teamId: string; data: Partial<TOrganizationTeamUpdate> }) => {
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
			if (error instanceof ZodValidationError) {
				console.error('Update team validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.teams.UPDATE_FAILED'), { description: t(reasonKey) });
		}
	});

	// Preserve exact same interface and logic as original
	const updateOrganizationTeamMutate = updateOrganizationTeamMutation.mutate;
	const updateOrganizationTeam = useCallback(
		(team: TOrganizationTeam, data: Partial<TOrganizationTeamUpdate> = {}) => {
			// Use React Query mutation instead of legacy queryCall
			updateOrganizationTeamMutate({
				teamId: team.id,
				data: {
					...team,
					...data
				}
			});
		},
		[updateOrganizationTeamMutate]
	);

	return {
		updateOrganizationTeam,
		loading: updateOrganizationTeamMutation.isPending // Map to legacy loading interface
	};
}
