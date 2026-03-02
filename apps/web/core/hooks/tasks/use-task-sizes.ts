'use client';

import { useTaskSizesQuery } from './use-task-sizes-query';
import { useCreateTaskSize } from './use-create-task-size';
import { useEditTaskSize } from './use-edit-task-size';
import { useDeleteTaskSize } from './use-delete-task-size';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useTaskSizesQuery` for read operations (list, loading, setTaskSizes)
 * - `useCreateTaskSize` for task size creation
 * - `useEditTaskSize` for task size edits
 * - `useDeleteTaskSize` for task size deletion
 * - `useInvalidateTaskSizes` for shared cache invalidation
 */
export function useTaskSizes() {
	const queryData = useTaskSizesQuery();
	const createData = useCreateTaskSize();
	const editData = useEditTaskSize();
	const deleteData = useDeleteTaskSize();

	return {
		// Query data
		taskSizes: queryData.taskSizes,
		loading: queryData.loading,
		getTaskSizesLoading: queryData.getTaskSizesLoading,
		setTaskSizes: queryData.setTaskSizes,
		loadTaskSizes: queryData.loadTaskSizes,
		firstLoadTaskSizesData: queryData.firstLoadTaskSizesData,

		// Mutations
		createTaskSize: createData.createTaskSize,
		createTaskSizeLoading: createData.createTaskSizeLoading,
		editTaskSize: editData.editTaskSize,
		editTaskSizeLoading: editData.editTaskSizeLoading,
		deleteTaskSize: deleteData.deleteTaskSize,
		deleteTaskSizeLoading: deleteData.deleteTaskSizeLoading
	};
}
