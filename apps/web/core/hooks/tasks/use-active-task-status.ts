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
import { useAtom, useAtomValue } from 'jotai';
import {
	setOptimisticValueAtom,
	clearOptimisticValueAtom,
	getOptimisticValueAtom
} from '@/core/stores/tasks/task-optimistic-updates';

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

	// Global optimistic state for synchronization between instances
	const [, setOptimisticValue] = useAtom(setOptimisticValueAtom);
	const [, clearOptimisticValue] = useAtom(clearOptimisticValueAtom);
	const getOptimisticValue = useAtomValue(getOptimisticValueAtom);

	// Local loading state (per component instance)
	const [isLocalLoading, setIsLocalLoading] = useState(false);

	const task = props.task !== undefined ? props.task : activeTeamTask;
	const $task = useSyncRef(task);

	// Reset optimistic value when task changes
	useEffect(() => {
		if (task?.id) {
			clearOptimisticValue({ taskId: task.id, field });
		}
		setIsLocalLoading(false);
	}, [task?.id, field, clearOptimisticValue]);

	/**
	 * Handle optimistic updates with proper error handling and user feedback
	 */
	function onItemChange(status: ITaskStatusStack[T]) {
		if (!task) return;

		// Start local loading state (isolated per component)
		setIsLocalLoading(true);

		// Set optimistic value globally for synchronization across all instances
		setOptimisticValue({
			taskId: task.id,
			field,
			value: status
		});

		let updatedField: ITaskStatusField = field;
		let taskStatusId: string | undefined;

		if (field === 'label') {
			const currentTag = taskLabels.find((label) => label.name === status) as ITag;
			updatedField = 'tags';
			status = [currentTag];
		}

		if (field === 'status') {
			const selectedStatus = taskStatuses.find((s) => s.name === status && s.value === status);
			taskStatusId = selectedStatus?.id;
		}

		taskUpdateQueue.task((task) => {
			const previousValue = task.current ? (task.current as any)[field] : undefined;
			return handleStatusUpdate(status, updatedField || field, taskStatusId, task.current, true)
				?.then(() => {
					// Success - keep optimistic value and show success toast with context
					const fieldDisplayName = field === 'issueType' ? 'issue type' : field;
					toast.success(`Task ${fieldDisplayName} updated successfully`, {
						description: previousValue
							? `Changed from "${previousValue}" to "${status}"`
							: `Set to "${status}"`
					});
				})
				.catch((error) => {
					// Error - revert optimistic value and show error toast
					if ($task.current?.id) {
						clearOptimisticValue({ taskId: $task.current.id, field });
					}
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

	// Get optimistic value from global store for synchronization
	const optimisticValue = task?.id ? getOptimisticValue(task.id, field) : undefined;

	// Use optimistic value if available, otherwise use actual task value
	const currentValue = optimisticValue !== undefined ? optimisticValue : task ? (task as any)[field] : undefined;

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
