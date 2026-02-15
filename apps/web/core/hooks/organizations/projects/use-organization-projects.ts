'use client';

import { useOrganizationProjectsQuery } from './use-organization-projects-query';
import { useCreateOrganizationProject } from './use-create-organization-project';
import { useEditOrganizationProject } from './use-edit-organization-project';
import { useDeleteOrganizationProject } from './use-delete-organization-project';
import { useOrganizationProjectsPagination } from './use-organization-projects-pagination';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useOrganizationProjectsQuery` for read operations (list, search, single fetch)
 * - `useCreateOrganizationProject` for project creation
 * - `useEditOrganizationProject` for project edits and settings
 * - `useDeleteOrganizationProject` for project deletion
 * - `useOrganizationProjectsPagination` for paginated project listing
 * - `useInvalidateOrganizationProjects` for shared cache invalidation
 */
export function useOrganizationProjects() {
	const queryData = useOrganizationProjectsQuery();
	const createData = useCreateOrganizationProject();
	const editData = useEditOrganizationProject();
	const deleteData = useDeleteOrganizationProject();
	const paginationData = useOrganizationProjectsPagination();

	return {
		// Query data
		...queryData,
		// Create mutation
		...createData,
		// Edit mutations
		...editData,
		// Delete mutation
		...deleteData,
		// Pagination
		...paginationData
	};
}
