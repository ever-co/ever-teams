'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TEditProjectRequest } from '@/core/types/schemas';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { editsProjectBudget } from '@/core/lib/utils/project-consumption';
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
	const { invalidateOrganizationProjectsData, queryClient, tenantId } = useInvalidateOrganizationProjects();

	const invalidateAfterEdit = useCallback(
		(edit: TEditProjectRequest) => {
			if (editsProjectBudget(edit)) {
				// The budget report states the project's budget, its type and its currency. It is a slow read
				// (every time log of the organisation), so the edit does not wait for it.
				void queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.reports.all });
			}
			return invalidateOrganizationProjectsData();
		},
		[invalidateOrganizationProjectsData, queryClient]
	);

	// Edit project mutation
	// Uses onSettled (not onSuccess) to always invalidate cache even on timeout.
	// A backend timeout (ECONNABORTED) does NOT mean the edit failed — the data may be saved.
	const editOrganizationProjectMutation = useMutation({
		mutationFn: ({ projectId, data }: { projectId: string; data: TEditProjectRequest }) =>
			organizationProjectService.editOrganizationProject({ organizationProjectId: projectId, data }),
		onSettled: (_project, _error, { data }) => invalidateAfterEdit(data)
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
	// Depend on the STABLE mutateAsync, not the mutation object (recreated on every state change).
	const editOrganizationProjectMutateAsync = editOrganizationProjectMutation.mutateAsync;
	const editOrganizationProject = useCallback(
		async (id: string, data: TEditProjectRequest) => {
			try {
				return await editOrganizationProjectMutateAsync({ projectId: id, data });
			} catch (error) {
				console.error('Failed to edit the organization project', error);
			}
		},
		[editOrganizationProjectMutateAsync]
	);

	const editOrganizationProjectSettingMutateAsync = editOrganizationProjectSettingMutation.mutateAsync;
	const editOrganizationProjectSetting = useCallback(
		(id: string, data: any) => {
			try {
				return editOrganizationProjectSettingMutateAsync({ projectId: id, data });
			} catch (error) {
				console.error('Failed to edit the organization project setting', error);
			}
		},
		[editOrganizationProjectSettingMutateAsync]
	);

	return {
		editOrganizationProject,
		editOrganizationProjectLoading: editOrganizationProjectMutation.isPending,
		editOrganizationProjectSetting,
		editOrganizationProjectSettingLoading: editOrganizationProjectSettingMutation.isPending
	};
}
