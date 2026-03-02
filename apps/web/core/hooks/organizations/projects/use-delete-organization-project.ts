'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';

/**
 * Hook for deleting an organization project with cache invalidation.
 *
 * @returns {Object} An object containing:
 * - `deleteOrganizationProject` - Async function to delete a project, returns boolean success
 * - `deleteOrganizationProjectLoading` - Boolean indicating mutation pending state
 */
export function useDeleteOrganizationProject() {
	const { invalidateOrganizationProjectsData } = useInvalidateOrganizationProjects();

	const deleteOrganizationProjectMutation = useMutation({
		mutationFn: (id: string) => organizationProjectService.deleteOrganizationProject(id),
		onSuccess: invalidateOrganizationProjectsData
	});

	const deleteOrganizationProject = useCallback(
		async (id: string): Promise<boolean> => {
			try {
				await deleteOrganizationProjectMutation.mutateAsync(id);
				return true; // Success if no exception thrown (204 No Content)
			} catch (error) {
				console.error('Failed to delete project:', error);
				return false;
			}
		},
		[deleteOrganizationProjectMutation]
	);

	return {
		deleteOrganizationProject,
		deleteOrganizationProjectLoading: deleteOrganizationProjectMutation.isPending
	};
}

