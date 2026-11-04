'use client';

import { useCallback, useMemo } from 'react';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { useCreateTaskLabel } from '@/core/hooks/tasks/use-create-task-label';
import { useEditTaskLabel } from '@/core/hooks/tasks/use-edit-task-label';
import { useDeleteTaskLabel } from '@/core/hooks/tasks/use-delete-task-label';
import {
	PropertyLookBody,
	propertyItemsOf,
	TaskPropertySettingsModel
} from '@/core/lib/utils/settings-task-properties';
import { usePropertyActions } from './use-property-actions';

export function useLabelSettings(): TaskPropertySettingsModel {
	const { taskLabels, loading, isError, refetch } = useTaskLabelsQuery();
	const { createTaskLabels } = useCreateTaskLabel();
	const { editTaskLabels } = useEditTaskLabel();
	const { deleteTaskLabels } = useDeleteTaskLabel();

	const editLabel = useCallback(
		(id: string, body: PropertyLookBody) => editTaskLabels({ id, data: body }),
		[editTaskLabels]
	);
	const { create, update, remove } = usePropertyActions({
		createProperty: createTaskLabels,
		editProperty: editLabel,
		deleteProperty: deleteTaskLabels
	});

	const items = useMemo(() => propertyItemsOf(taskLabels), [taskLabels]);

	return { items, isLoading: loading, isError, retry: refetch, create, update, remove };
}
