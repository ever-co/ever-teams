'use client';

import { useTaskRelatedIssueTypesQuery } from './use-task-related-issue-types-query';
import { useCreateTaskRelatedIssueType } from './use-create-task-related-issue-type';
import { useEditTaskRelatedIssueType } from './use-edit-task-related-issue-type';
import { useDeleteTaskRelatedIssueType } from './use-delete-task-related-issue-type';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useTaskRelatedIssueTypesQuery` for read operations
 * - `useCreateTaskRelatedIssueType` for creation
 * - `useEditTaskRelatedIssueType` for edits
 * - `useDeleteTaskRelatedIssueType` for deletion
 * - `useInvalidateTaskRelatedIssueTypes` for shared cache invalidation
 */
export function useTaskRelatedIssueType() {
	const queryData = useTaskRelatedIssueTypesQuery();
	const createData = useCreateTaskRelatedIssueType();
	const editData = useEditTaskRelatedIssueType();
	const deleteData = useDeleteTaskRelatedIssueType();

	return {
		taskRelatedIssueTypes: queryData.taskRelatedIssueTypes,
		loading: queryData.loading,
		firstLoadTaskRelatedIssueTypeData: queryData.firstLoadTaskRelatedIssueTypeData,
		createTaskRelatedIssueType: createData.createTaskRelatedIssueType,
		createTaskRelatedIssueTypeLoading: createData.createTaskRelatedIssueTypeLoading,
		deleteTaskRelatedIssueType: deleteData.deleteTaskRelatedIssueType,
		deleteTaskRelatedIssueTypeLoading: deleteData.deleteTaskRelatedIssueTypeLoading,
		editTaskRelatedIssueType: editData.editTaskRelatedIssueType,
		editTaskRelatedIssueTypeLoading: editData.editTaskRelatedIssueTypeLoading,
		loadTaskRelatedIssueTypeData: queryData.loadTaskRelatedIssueTypeData
	};
}
