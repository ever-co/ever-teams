import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskLabelsQuery } from './use-task-labels-query';

export function useTaskLabelsValue() {
	const { taskLabels } = useTaskLabelsQuery();
	return useMapToTaskStatusValues(taskLabels as any[], false);
}
