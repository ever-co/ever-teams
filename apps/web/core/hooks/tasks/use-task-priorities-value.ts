import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskPrioritiesQuery } from './use-task-priorities-query';

export function useTaskPrioritiesValue() {
	const { taskPriorities } = useTaskPrioritiesQuery();
	return useMapToTaskStatusValues(taskPriorities, false);
}
