import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { taskVersionsState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export function useTaskVersionsValue() {
	const taskVersions = useAtomValue(taskVersionsState);

	return useMapToTaskStatusValues(taskVersions, false);
}
