'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TEditProjectRequest } from '@/core/types/schemas';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';

/**
 * Hook for editing an organization project and its settings with cache invalidation.
 *
 * @returns {Object} An object containing:
 * - `editOrganizationProject` - Async function to edit a project
 * - `editOrganizationProjectLoading` - Boolean indicating edit mutation pending state
 * - `editOrganizationProjectSetting` - Async function to edit project settings
 * - `editOrganizationProjectSettingLoading` - Boolean indicating settings mutation pending state
 */
export function useEditOrganizationProject() {
	const { invalidateOrganizationProjectsData, tenantId } = useInvalidateOrganizationProjects();

	// Edit project mutation
	// Uses onSettled (not onSuccess) to always invalidate cache even on timeout.
	// A backend timeout (ECONNABORTED) does NOT mean the edit failed — the data may be saved.
	const editOrganizationProjectMutation = useMutation({
		mutationFn: ({ projectId, data }: { projectId: string; data: TEditProjectRequest }) =>
			organizationProjectService.editOrganizationProject({ organizationProjectId: projectId, data }),
		onSettled: invalidateOrganizationProjectsData
	});

	// Edit project setting mutation
	// Same rationale: always invalidate cache regardless of client-side timeout.
	const editOrganizationProjectSettingMutation = useMutation({
		mutationFn: ({ projectId, data }: { projectId: string; data: any }) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId. Ensure you have tenantId set in cookies.');
			}
			return organizationProjectService.editOrganizationProjectSetting({
				organizationProjectId: projectId,
				data
			});
		},
		onSettled: invalidateOrganizationProjectsData
	});

	// Callback wrappers for backward compatibility
	const editOrganizationProject = useCallback(
		async (id: string, data: TEditProjectRequest) => {
			try {
				return await editOrganizationProjectMutation.mutateAsync({ projectId: id, data });
			} catch (error) {
				console.error('Failed to edit the organization project', error);
			}
		},
		[editOrganizationProjectMutation]
	);

	const editOrganizationProjectSetting = useCallback(
		(id: string, data: any) => {
			try {
				return editOrganizationProjectSettingMutation.mutateAsync({ projectId: id, data });
			} catch (error) {
				console.error('Failed to edit the organization project setting', error);
			}
		},
		[editOrganizationProjectSettingMutation]
	);

	return {
		editOrganizationProject,
		editOrganizationProjectLoading: editOrganizationProjectMutation.isPending,
		editOrganizationProjectSetting,
		editOrganizationProjectSettingLoading: editOrganizationProjectSettingMutation.isPending
	};
}

