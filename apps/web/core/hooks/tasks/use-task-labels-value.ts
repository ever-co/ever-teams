import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskLabels } from './use-task-labels';

export function useTaskLabelsValue() {
	const { taskLabels } = useTaskLabels();
	return useMapToTaskStatusValues(taskLabels as any[], false);
}
