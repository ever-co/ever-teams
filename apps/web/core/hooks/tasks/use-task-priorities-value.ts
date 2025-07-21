import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskPriorities } from './use-task-priorities';

export function useTaskPrioritiesValue() {
	const { taskPriorities } = useTaskPriorities();
	return useMapToTaskStatusValues(taskPriorities, false);
}
