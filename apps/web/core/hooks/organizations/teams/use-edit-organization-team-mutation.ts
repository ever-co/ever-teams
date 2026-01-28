'use client';

import { queryKeys } from '@/core/query/keys';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { organizationTeamsState } from '@/core/stores';
import { TOrganizationTeamUpdate } from '@/core/types/schemas';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { useGetOrganizationTeamById } from './use-get-organization-teams-query';

/**
 * Mutation hook for editing an organization team.
 *
 * @description
 * Updates team data via API, refreshes Jotai state with full team details,
 * and invalidates React Query cache. Handles Zod validation errors with toast notifications.
 *
 * @example
 * ```tsx
 * const { mutate: editTeam, isPending } = useEditOrganizationTeamMutation();
 *
 * const handleSubmit = (data: Partial<TOrganizationTeamUpdate>) => {
 *   editTeam(data, {
 *     onSuccess: () => toast.success('Team updated!')
 *   });
 * };
 * ```
 *
 * @see {@link useGetOrganizationTeamById} - Fetches updated team details
 * @see {@link organizationTeamsState} - Jotai state updated on success
 *
 * @returns TanStack mutation object
 */
export const useEditOrganizationTeamMutation = () => {
	const queryClient = useQueryClient();
	const setTeams = useSetAtom(organizationTeamsState);

	const getTeamById = useGetOrganizationTeamById();

	return useMutation({
		mutationFn: (data: Partial<TOrganizationTeamUpdate>) => {
			return organizationTeamService.editOrganizationTeam(data);
		},
		mutationKey: queryKeys.organizationTeams.mutations.edit(null),
		onSuccess: async (response) => {
			const { data: teamUpdated } = await getTeamById(response.data.id);
			setTeams((currentTeams) => {
				return (currentTeams ?? []).map((old) => (old.id == teamUpdated.id ? teamUpdated : old));
			});

			// Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			// Enhanced error handling
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
			toast.error('Edit team validation failed');
			// Original error will be thrown and handled by calling code
		}
	});
};
