import { TTaskStatus } from '@/core/types/schemas';
import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskSizes } from './use-task-sizes';

export function useTaskSizesValue() {
	const { taskSizes } = useTaskSizes();
	return useMapToTaskStatusValues(taskSizes as TTaskStatus[], false);
}
