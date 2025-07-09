/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { useStatusValue, useSyncRef, useTaskLabels, useTaskStatus, useTeamTasks } from '@/core/hooks';
import { ITag } from '@/core/types/interfaces/tag/tag';
import { TStatus, IActiveTaskStatuses } from '@/core/types/interfaces/task/task-card';
import { taskUpdateQueue } from '@/core/utils/task.utils';
import { useCallback, useState, useEffect } from 'react';
import { toast } from 'sonner';

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
	const [optimisticValue, setOptimisticValue] = useState<ITaskStatusStack[T] | null>(null);
	const [isLocalLoading, setIsLocalLoading] = useState(false);

	const task = props.task !== undefined ? props.task : activeTeamTask;
	const $task = useSyncRef(task);

	// Reset optimistic value when task changes
	useEffect(() => {
		setOptimisticValue(null);
		setIsLocalLoading(false);
	}, [task?.id]);

	/**
	 * Handle optimistic updates with proper error handling and user feedback
	 */
	function onItemChange(status: ITaskStatusStack[T]) {
		if (!task) return;

		// Start local loading state (isolated per component)
		setIsLocalLoading(true);

		// Set optimistic value immediately for UI feedback
		setOptimisticValue(status);

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
			return handleStatusUpdate(status, updatedField || field, taskStatusId, task.current, true)
				?.then(() => {
					// Success - keep optimistic value and show success toast
					toast.success(`Task ${field} updated successfully`);
				})
				.catch((error) => {
					// Error - revert optimistic value and show error toast
					setOptimisticValue(null);
					toast.error(`Failed to update task ${field}`, {
						description: (error as any)?.message || 'Please try again'
					});
					console.error(`Error updating task ${field}:`, error);
				})
				.finally(() => {
					// Always clear local loading state
					setIsLocalLoading(false);
				});
		}, $task);
	}

	// Use optimistic value if available, otherwise use actual task value
	const currentValue = optimisticValue !== null ? optimisticValue : task ? (task as any)[field] : undefined;

	const { item, items, onChange } = useStatusValue<T>({
		status: status,
		value: props.defaultValue ? props.defaultValue : currentValue,
		onValueChange: onItemChange,
		defaultValues: props.defaultValues
	});

	return {
		item,
		items,
		onChange,
		task,
		field,
		optimisticValue,
		isLocalLoading
	};
}
