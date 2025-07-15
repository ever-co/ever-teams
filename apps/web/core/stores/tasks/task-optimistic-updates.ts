import { atom } from 'jotai';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';

/**
 * Global store for optimistic task updates
 * Provides synchronization between multiple dropdown instances
 */

// Type for optimistic update entry
export interface OptimisticUpdate {
	taskId: string;
	field: ITaskStatusField;
	value: any;
	timestamp: number;
}

// Type for optimistic updates map: taskId -> field -> value
export type OptimisticUpdatesMap = Record<string, Record<string, any>>;

/**
 * Global atom storing all optimistic updates
 * Structure: { taskId: { field: value } }
 */
export const taskOptimisticUpdatesState = atom<OptimisticUpdatesMap>({});

/**
 * Atom to set an optimistic value for a specific task and field
 */
export const setOptimisticValueAtom = atom(null, (get, set, update: OptimisticUpdate) => {
	const current = get(taskOptimisticUpdatesState);
	const { taskId, field, value } = update;

	set(taskOptimisticUpdatesState, {
		...current,
		[taskId]: {
			...current[taskId],
			[field]: value
		}
	});
});

/**
 * Atom to clear an optimistic value for a specific task and field
 */
export const clearOptimisticValueAtom = atom(null, (get, set, params: { taskId: string; field: ITaskStatusField }) => {
	const current = get(taskOptimisticUpdatesState);
	const { taskId, field } = params;

	if (current[taskId]) {
		const taskUpdates = { ...current[taskId] };
		delete taskUpdates[field];

		// If no more fields for this task, remove the task entry
		if (Object.keys(taskUpdates).length === 0) {
			const newState = { ...current };
			delete newState[taskId];
			set(taskOptimisticUpdatesState, newState);
		} else {
			set(taskOptimisticUpdatesState, {
				...current,
				[taskId]: taskUpdates
			});
		}
	}
});

/**
 * Atom to get optimistic value for a specific task and field
 */
export const getOptimisticValueAtom = atom((get) => (taskId: string, field: ITaskStatusField) => {
	const updates = get(taskOptimisticUpdatesState);
	return updates[taskId]?.[field];
});

/**
 * Atom to clear all optimistic values for a specific task
 */
export const clearTaskOptimisticValuesAtom = atom(null, (get, set, taskId: string) => {
	const current = get(taskOptimisticUpdatesState);
	if (current[taskId]) {
		const newState = { ...current };
		delete newState[taskId];
		set(taskOptimisticUpdatesState, newState);
	}
});
