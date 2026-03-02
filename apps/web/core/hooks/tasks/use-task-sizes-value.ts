import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskSizesQuery } from './use-task-sizes-query';

export function useTaskSizesValue() {
	const { taskSizes } = useTaskSizesQuery();
	return useMapToTaskStatusValues(taskSizes, false);
}
