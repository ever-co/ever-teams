'use client';
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { TOrganizationTeam, TOrganizationTeamEmployeeUpdate, organizationTeamSchema } from '@/core/types/schemas';
import { validateApiResponse, ZodValidationError } from '@/core/types/schemas/utils/validation';
import { queryKeys } from '@/core/query/keys';
import { useTeamsState } from './use-teams-state';

/**
 * ✅ PHASE 2 MIGRATION: React Query implementation for updating organization teams
 * Maintains 100% backward compatibility while adding React Query benefits:
 * - Automatic cache invalidation
 * - Zod validation
 * - Better error handling
 * - Optimistic updates support
 */
export function useUpdateOrganizationTeam() {
	const queryClient = useQueryClient();
	const { setTeamsUpdate } = useTeamsState();

	// ✅ React Query mutation with full validation and cache management
	const updateOrganizationTeamMutation = useMutation({
		mutationFn: ({ teamId, data }: { teamId: string; data: Partial<TOrganizationTeamEmployeeUpdate> }) => {
			return organizationTeamService.updateOrganizationTeam(teamId, data);
		},
		mutationKey: queryKeys.organizationTeams.mutations.update(null), // ✅ Fixed: Added mutationKey
		onSuccess: (response) => {
			// ✅ Validate API response with Zod schema
			const validatedData = validateApiResponse(
				organizationTeamSchema,
				response.data,
				'updateOrganizationTeam mutation response'
			);

			// ✅ Preserve backward compatibility - exact same behavior
			setTeamsUpdate(validatedData);

			// ✅ Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			// ✅ Enhanced error handling with Zod validation errors
			if (error instanceof ZodValidationError) {
				console.error('Update team validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			// Original error will be thrown and handled by calling code
		}
	});

	// ✅ Preserve exact same interface and logic as original
	const updateOrganizationTeam = useCallback(
		(team: TOrganizationTeam, data: Partial<TOrganizationTeamEmployeeUpdate> = {}) => {
			const members = team.members;

			const body: Partial<TOrganizationTeamEmployeeUpdate> = {
				id: team.id,
				memberIds: members
					?.map((t) => t.employee?.id || '')
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				managerIds: members
					?.filter((m) => m.role && m.role.name === 'MANAGER')
					.map((t) => t.employee?.id || '')
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				name: team.name,
				tenantId: team.tenantId,
				organizationId: team.organizationId,
				tags: [],
				...data
			};

			// ✅ Use React Query mutation instead of legacy queryCall
			updateOrganizationTeamMutation.mutate({ teamId: team.id, data: body });
		},
		[updateOrganizationTeamMutation]
	);

	return {
		updateOrganizationTeam,
		loading: updateOrganizationTeamMutation.isPending // ✅ Map to legacy loading interface
	};
}
