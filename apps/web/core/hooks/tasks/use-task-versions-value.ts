import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskVersion } from './use-task-version';

export function useTaskVersionsValue() {
	const { taskVersions } = useTaskVersion();

	return useMapToTaskStatusValues(taskVersions, false);
}
