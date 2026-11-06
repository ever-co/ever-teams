'use client';

import { useMemo } from 'react';
import { useTaskPrioritiesQuery } from '@/core/hooks/tasks/use-task-priorities-query';
import { useCreateTaskPriority } from '@/core/hooks/tasks/use-create-task-priority';
import { useEditTaskPriority } from '@/core/hooks/tasks/use-edit-task-priority';
import { useDeleteTaskPriority } from '@/core/hooks/tasks/use-delete-task-priority';
import { propertyItemsOf, TaskPropertySettingsModel } from '@/core/lib/utils/settings-task-properties';
import { usePropertyActions } from './use-property-actions';

export function usePrioritySettings(): TaskPropertySettingsModel {
	const { taskPriorities, loading, isError, refetch } = useTaskPrioritiesQuery();
	const { createTaskPriorities } = useCreateTaskPriority();
	const { editTaskPriorities } = useEditTaskPriority();
	const { deleteTaskPriorities } = useDeleteTaskPriority();
	const { create, update, remove } = usePropertyActions({
		createProperty: createTaskPriorities,
		editProperty: editTaskPriorities,
		deleteProperty: deleteTaskPriorities
	});

	const items = useMemo(() => propertyItemsOf(taskPriorities), [taskPriorities]);

	return { items, isLoading: loading, isError, retry: refetch, create, update, remove };
}
