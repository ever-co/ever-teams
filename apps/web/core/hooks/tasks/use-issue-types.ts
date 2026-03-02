'use client';

import { useIssueTypesQuery } from './use-issue-types-query';
import { useCreateIssueType } from './use-create-issue-type';
import { useEditIssueType } from './use-edit-issue-type';
import { useDeleteIssueType } from './use-delete-issue-type';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useIssueTypesQuery` for read operations (list, loading)
 * - `useCreateIssueType` for issue type creation
 * - `useEditIssueType` for issue type edits
 * - `useDeleteIssueType` for issue type deletion
 * - `useInvalidateIssueTypes` for shared cache invalidation
 */
export function useIssueType() {
	const queryData = useIssueTypesQuery();
	const createData = useCreateIssueType();
	const editData = useEditIssueType();
	const deleteData = useDeleteIssueType();

	return {
		issueTypes: queryData.issueTypes,
		loading: queryData.loading,
		firstLoadIssueTypeData: queryData.firstLoadIssueTypeData,
		createIssueType: createData.createIssueType,
		createIssueTypeLoading: createData.createIssueTypeLoading,
		deleteIssueType: deleteData.deleteIssueType,
		deleteIssueTypeLoading: deleteData.deleteIssueTypeLoading,
		editIssueType: editData.editIssueType,
		editIssueTypeLoading: editData.editIssueTypeLoading
	};
}
