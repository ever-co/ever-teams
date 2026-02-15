'use client';

import { useTaskPrioritiesQuery } from './use-task-priorities-query';
import { useCreateTaskPriority } from './use-create-task-priority';
import { useEditTaskPriority } from './use-edit-task-priority';
import { useDeleteTaskPriority } from './use-delete-task-priority';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useTaskPrioritiesQuery` for read operations (list, loading, setTaskPriorities)
 * - `useCreateTaskPriority` for task priority creation
 * - `useEditTaskPriority` for task priority edits
 * - `useDeleteTaskPriority` for task priority deletion
 * - `useInvalidateTaskPriorities` for shared cache invalidation
 */
export function useTaskPriorities() {
	const queryData = useTaskPrioritiesQuery();
	const createData = useCreateTaskPriority();
	const editData = useEditTaskPriority();
	const deleteData = useDeleteTaskPriority();

	return {
		// Query data
		taskPriorities: queryData.taskPriorities,
		loading: queryData.loading,
		getTaskPrioritiesLoading: queryData.getTaskPrioritiesLoading,
		setTaskPriorities: queryData.setTaskPriorities,
		loadTaskPriorities: queryData.loadTaskPriorities,
		firstLoadTaskPrioritiesData: queryData.firstLoadTaskPrioritiesData,

		// Mutations
		createTaskPriorities: createData.createTaskPriorities,
		createTaskPrioritiesLoading: createData.createTaskPrioritiesLoading,
		editTaskPriorities: editData.editTaskPriorities,
		editTaskPrioritiesLoading: editData.editTaskPrioritiesLoading,
		deleteTaskPriorities: deleteData.deleteTaskPriorities,
		deleteTaskPrioritiesLoading: deleteData.deleteTaskPrioritiesLoading
	};
}
