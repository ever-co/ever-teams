'use client';

import { queryKeys } from '@/core/query/keys';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthenticateUser } from '../../auth';

export const useDeleteOrganizationTeamMutation = () => {
	const queryClient = useQueryClient();

	const { logOut } = useAuthenticateUser();

	const deleteOrganizationTeamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const clearDeleteTimeout = useCallback(() => {
		if (deleteOrganizationTeamTimeoutRef.current) {
			clearTimeout(deleteOrganizationTeamTimeoutRef.current);
			deleteOrganizationTeamTimeoutRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => clearDeleteTimeout();
	}, [clearDeleteTimeout]);

	return useMutation({
		mutationFn: (id: string) => {
			return organizationTeamService.deleteOrganizationTeam(id);
		},
		mutationKey: queryKeys.organizationTeams.mutations.delete(null),
		onSuccess: async (response) => {
			// Preserve critical side-effect - loadTeamsData() for complete refetch
			toast.success('Team deleted successfully', {
				description: `Team "${response.data.name}" has been deleted. You will be logged out of the application to choose a new workspace.`
			});

			// Clear previous timeout if any
			clearDeleteTimeout();

			// Set a new timeout
			deleteOrganizationTeamTimeoutRef.current = setTimeout(() => {
				logOut();

				queryClient.invalidateQueries({
					queryKey: queryKeys.organizationTeams.all
				});

				// Clear ref after execution
				deleteOrganizationTeamTimeoutRef.current = null;
			}, 3000);
		},
		onError: (error) => {
			// Enhanced error handling
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
			toast.error('Delete team validation failed');
			// Original error will be thrown and handled by calling code
		}
	});
};
