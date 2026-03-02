'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TCreateProjectRequest } from '@/core/types/schemas';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';

/**
 * Hook for creating an organization project with cache invalidation.
 *
 * @returns {Object} An object containing:
 * - `createOrganizationProject` - Async function to create a project
 * - `createOrganizationProjectLoading` - Boolean indicating mutation pending state
 */
export function useCreateOrganizationProject() {
	const { invalidateOrganizationProjectsData, organizationId, tenantId } = useInvalidateOrganizationProjects();

	const createOrganizationProjectMutation = useMutation({
		mutationFn: (data: Partial<TCreateProjectRequest>) =>
			organizationProjectService.createOrganizationProject({ ...data, organizationId, tenantId }),
		onSuccess: invalidateOrganizationProjectsData
	});

	const createOrganizationProject = useCallback(
		async (data: Partial<TCreateProjectRequest>) => {
			try {
				const res = await createOrganizationProjectMutation.mutateAsync(data);
				return res;
			} catch (error) {
				console.error('Failed to create the organization project', error);
			}
		},
		[createOrganizationProjectMutation]
	);

	return {
		createOrganizationProject,
		createOrganizationProjectLoading: createOrganizationProjectMutation.isPending
	};
}

