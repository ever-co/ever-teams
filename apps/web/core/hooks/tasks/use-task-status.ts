'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCallbackRef, useSyncRef } from '../common';
import { TStatus, TStatusItem } from '@/core/types/interfaces/task/task-card';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskStatusesQuery } from './use-task-statuses-query';
import { useCreateTaskStatus } from './use-create-task-status';
import { useEditTaskStatus } from './use-edit-task-status';
import { useDeleteTaskStatus } from './use-delete-task-status';
import { useReorderTaskStatus } from './use-reorder-task-status';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useTaskStatusesQuery` for read operations (list, loading, setTaskStatuses)
 * - `useCreateTaskStatus` for task status creation
 * - `useEditTaskStatus` for task status edits
 * - `useDeleteTaskStatus` for task status deletion
 * - `useReorderTaskStatus` for task status reordering
 * - `useInvalidateTaskStatuses` for shared cache invalidation
 */
export function useTaskStatus() {
	const queryData = useTaskStatusesQuery();
	const createData = useCreateTaskStatus();
	const editData = useEditTaskStatus();
	const deleteData = useDeleteTaskStatus();
	const reorderData = useReorderTaskStatus();

	return {
		// Query data
		taskStatuses: queryData.taskStatuses,
		loading: queryData.loading,
		getTaskStatusesLoading: queryData.getTaskStatusesLoading,
		setTaskStatuses: queryData.setTaskStatuses,
		loadTaskStatuses: queryData.loadTaskStatuses,
		firstLoadTaskStatusesData: queryData.firstLoadTaskStatusesData,

		// Mutations
		createTaskStatus: createData.createTaskStatus,
		createTaskStatusLoading: createData.createTaskStatusLoading,
		editTaskStatus: editData.editTaskStatus,
		editTaskStatusLoading: editData.editTaskStatusLoading,
		deleteTaskStatus: deleteData.deleteTaskStatus,
		deleteTaskStatusLoading: deleteData.deleteTaskStatusLoading,
		reOrderTaskStatus: reorderData.reOrderTaskStatus,
		reOrderTaskStatusLoading: reorderData.reOrderTaskStatusLoading
	};
}

/**
 * It returns a set of items, the selected item, and a callback to change the selected item
 * @param statusItems - This is the object that contains the status items.
 * @param {ITaskStatusStack[T] | undefined}  - The current value of the status field.
 * @param [onValueChange] - This is the callback function that will be called when the value changes.
 */

export function useStatusValue<T extends ITaskStatusField>({
	value: $value,
	status: statusItems,
	onValueChange,
	multiple,
	defaultValues = []
}: {
	status: TStatus<ITaskStatusStack[T]>;
	value: ITaskStatusStack[T] | undefined;
	defaultValues?: ITaskStatusStack[T][];
	onValueChange?: (v: ITaskStatusStack[T], values?: ITaskStatusStack[T][]) => void;
	multiple?: boolean;
}) {
	const onValueChangeRef = useCallbackRef(onValueChange);
	const multipleRef = useSyncRef(multiple);

	const items = useMemo(() => {
		return Object.keys(statusItems).map((key) => {
			const value = statusItems[key as ITaskStatusStack[T]];
			if (!value.value) {
				value.value = key;
			}
			return {
				...value,
				name: key,
				displayName: key.split('-').join(' ')
			} as Required<TStatusItem>;
		});
	}, [statusItems]);

	const [value, setValue] = useState<ITaskStatusStack[T] | undefined>($value);
	const [values, setValues] = useState<ITaskStatusStack[T][]>(defaultValues);
	const valuesRef = useSyncRef(values);
	// Use external value ($value) for immediate UI updates, fallback to internal state (value)
	const effectiveValue = $value !== undefined ? $value : value;
	const item: TStatusItem | undefined = useMemo(
		() => items.find((r) => r.value === effectiveValue || r.name === effectiveValue),
		[items, effectiveValue]
	);

	useEffect(() => {
		if ($value !== value) {
			setValue($value);
		}
	}, [$value, value]);

	useEffect(() => {
		if (defaultValues.length > 0 && JSON.stringify(values) !== JSON.stringify(defaultValues)) {
			setValues(defaultValues);
		}
	}, [defaultValues, values]);

	const onChange = useCallback(
		(value: ITaskStatusStack[T]) => {
			if (multipleRef.current) {
				const prevValues = valuesRef.current;
				const newValues =
					typeof value === 'string'
						? prevValues.includes(value)
							? prevValues.filter((v) => v !== value)
							: [...prevValues, value]
						: Array.isArray(value)
							? value
							: [value];
				setValues(newValues);
				onValueChangeRef?.current?.(value, newValues);
			} else {
				setValue(value);
				onValueChangeRef?.current?.(value, [value]);
			}
		},
		[onValueChangeRef, multipleRef]
	);

	return {
		items,
		onChange,
		item,
		values
	};
}

//! =============== Task Status ================= //

export function useTaskStatusValue() {
	const { taskStatuses } = useTaskStatusesQuery();
	return useMapToTaskStatusValues(taskStatuses);
}
