'use client';

import { useTaskVersionsQuery } from './use-task-versions-query';
import { useCreateTaskVersion } from './use-create-task-version';
import { useEditTaskVersion } from './use-edit-task-version';
import { useDeleteTaskVersion } from './use-delete-task-version';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useTaskVersionsQuery` for read operations
 * - `useCreateTaskVersion` for task version creation
 * - `useEditTaskVersion` for task version edits
 * - `useDeleteTaskVersion` for task version deletion
 * - `useInvalidateTaskVersions` for shared cache invalidation
 */
export function useTaskVersion() {
	const queryData = useTaskVersionsQuery();
	const createData = useCreateTaskVersion();
	const editData = useEditTaskVersion();
	const deleteData = useDeleteTaskVersion();

	return {
		loading: queryData.loading,
		taskVersions: queryData.taskVersions,
		taskVersionFetching: queryData.taskVersionFetching,
		firstLoadTaskVersionData: queryData.firstLoadTaskVersionData,
		createTaskVersion: createData.createTaskVersion,
		createTaskVersionLoading: createData.createTaskVersionLoading,
		deleteTaskVersion: deleteData.deleteTaskVersion,
		deleteTaskVersionLoading: deleteData.deleteTaskVersionLoading,
		editTaskVersion: editData.editTaskVersion,
		editTaskVersionLoading: editData.editTaskVersionLoading,
		loadTaskVersionData: queryData.loadTaskVersionData
	};
}
