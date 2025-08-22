import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { taskPrioritiesListState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export function useTaskPrioritiesValue() {
	const taskPriorities = useAtomValue(taskPrioritiesListState);
	return useMapToTaskStatusValues(taskPriorities, false);
}
