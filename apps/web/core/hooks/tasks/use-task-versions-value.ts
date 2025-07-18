import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { useTaskVersion } from './use-task-version';

export function useTaskVersionsValue() {
	const { taskVersions: taskVersion } = useTaskVersion();

	return useMapToTaskStatusValues(taskVersion, false);
}
