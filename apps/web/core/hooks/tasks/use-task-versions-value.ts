import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskVersionsQuery } from './use-task-versions-query';

export function useTaskVersionsValue() {
	const { taskVersions } = useTaskVersionsQuery();

	return useMapToTaskStatusValues(taskVersions, false);
}
