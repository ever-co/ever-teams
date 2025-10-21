import { useMapToTaskStatusValues } from './use-map-to-task-status-values';
import { taskSizesListState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export function useTaskSizesValue() {
	const taskSizes = useAtomValue(taskSizesListState);
	return useMapToTaskStatusValues(taskSizes, false);
}
