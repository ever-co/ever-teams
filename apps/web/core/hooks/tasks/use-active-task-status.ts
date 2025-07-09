/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { useStatusValue, useSyncRef, useTaskLabels, useTaskStatus, useTeamTasks } from '@/core/hooks';
import { ITag } from '@/core/types/interfaces/tag/tag';
import { TStatus, IActiveTaskStatuses } from '@/core/types/interfaces/task/task-card';
import { taskUpdateQueue } from '@/core/utils/task.utils';
import { useCallback, useState } from 'react';

/**
 * Hook for managing loading states in task dropdown components
 * Provides optimistic updates, loading indicators, and error handling
 */
export function useTaskDropdownLoading<T extends ITaskStatusField>(
	field: T,
	task: any,
	onUpdate: (value: ITaskStatusStack[T]) => Promise<void>
) {
	const [isLoading, setIsLoading] = useState(false);
	const [optimisticValue, setOptimisticValue] = useState<ITaskStatusStack[T] | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleUpdate = useCallback(
		async (value: ITaskStatusStack[T]) => {
			if (!task) return;

			setIsLoading(true);
			setOptimisticValue(value);
			setError(null);

			try {
				await onUpdate(value);
				// Success - keep optimistic value
			} catch (err) {
				// Error - revert optimistic value
				setOptimisticValue(null);
				setError(err instanceof Error ? err.message : 'Update failed');
				console.error(`Error updating task ${field}:`, err);
			} finally {
				setIsLoading(false);
			}
		},
		[task, onUpdate, field]
	);

	const getCurrentValue = useCallback(() => {
		return optimisticValue !== null ? optimisticValue : task?.[field];
	}, [optimisticValue, task, field]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		isLoading,
		optimisticValue,
		error,
		handleUpdate,
		getCurrentValue,
		clearError
	};
}

export function useActiveTaskStatus<T extends ITaskStatusField>(
	props: IActiveTaskStatuses<T>,
	status: TStatus<ITaskStatusStack[T]>,
	field: T
) {
	const { activeTeamTask, handleStatusUpdate } = useTeamTasks();
	const { taskLabels } = useTaskLabels();
	const { taskStatuses } = useTaskStatus();

	const task = props.task !== undefined ? props.task : activeTeamTask;
	const $task = useSyncRef(task);

	/**
	 * "When the user changes the status of a task, update the status of the task and then call the
	 * onChangeLoading function with true, and when the status update is complete, call the onChangeLoading
	 * function with false."
	 *
	 * The first line of the function is a type annotation. It says that the function takes a single
	 * argument, which is an object of type ITaskStatusStack[T]. The type annotation is optional, but it's
	 * a good idea to include it
	 * @param status - The new status of the item.
	 */
	function onItemChange(status: ITaskStatusStack[T]) {
		props.onChangeLoading && props.onChangeLoading(true);

		let updatedField: ITaskStatusField = field;
		let taskStatusId: string | undefined;

		if (field === 'label' && task) {
			const currentTag = taskLabels.find((label) => label.name === status) as ITag;
			updatedField = 'tags';
			status = [currentTag];
		}

		if (field === 'status') {
			const selectedStatus = taskStatuses.find((s) => s.name === status && s.value === status);
			taskStatusId = selectedStatus?.id;
		}

		taskUpdateQueue.task((task) => {
			return handleStatusUpdate(status, updatedField || field, taskStatusId, task.current, true)?.finally(() => {
				props.onChangeLoading && props.onChangeLoading(false);
			});
		}, $task);
	}

	const { item, items, onChange } = useStatusValue<T>({
		status: status,
		value: props.defaultValue ? props.defaultValue : task ? (task as any)[field] : undefined,
		onValueChange: onItemChange,
		defaultValues: props.defaultValues
	});

	return {
		item,
		items,
		onChange,
		task,
		field
	};
}
