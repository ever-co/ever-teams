'use client';

import { useMemo } from 'react';
import { useTaskSizesQuery } from '@/core/hooks/tasks/use-task-sizes-query';
import { useCreateTaskSize } from '@/core/hooks/tasks/use-create-task-size';
import { useEditTaskSize } from '@/core/hooks/tasks/use-edit-task-size';
import { useDeleteTaskSize } from '@/core/hooks/tasks/use-delete-task-size';
import { propertyItemsOf, TaskPropertySettingsModel } from '@/core/lib/utils/settings-task-properties';
import { usePropertyActions } from './use-property-actions';

export function useSizeSettings(): TaskPropertySettingsModel {
	const { taskSizes, loading, isError, refetch } = useTaskSizesQuery();
	const { createTaskSize } = useCreateTaskSize();
	const { editTaskSize } = useEditTaskSize();
	const { deleteTaskSize } = useDeleteTaskSize();
	const { create, update, remove } = usePropertyActions({
		createProperty: createTaskSize,
		editProperty: editTaskSize,
		deleteProperty: deleteTaskSize
	});

	const items = useMemo(() => propertyItemsOf(taskSizes), [taskSizes]);

	return { items, isLoading: loading, isError, retry: refetch, create, update, remove };
}
