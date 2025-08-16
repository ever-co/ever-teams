import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { taskLabelsListState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export function useTaskLabelsValue() {
	const taskLabels = useAtomValue(taskLabelsListState);
	return useMapToTaskStatusValues(taskLabels as any[], false);
}
