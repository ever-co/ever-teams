import { useCallback } from 'react';
import { useTaskPriorities } from './useTaskPriorities';
import { useTaskRelatedIssueType } from './useTaskRelatedIssueType';
import { useTaskSizes } from './useTaskSizes';
import { useTaskStatus } from './useTaskStatus';
import { useTaskVersion } from './useTaskVersion';

export function useRefetchData() {
	const { loadTaskStatusData } = useTaskStatus();
	const { loadTaskVersionData } = useTaskVersion();
	const { loadTaskPriorities } = useTaskPriorities();
	const { loadTaskSizes } = useTaskSizes();
	const { loadTaskRelatedIssueTypeData } = useTaskRelatedIssueType();

	const refetch = useCallback(() => {
		loadTaskStatusData();
		loadTaskVersionData();
		loadTaskPriorities();
		loadTaskSizes();
		loadTaskRelatedIssueTypeData();
	}, [loadTaskStatusData, loadTaskVersionData, loadTaskPriorities, loadTaskSizes, loadTaskRelatedIssueTypeData]);

	return { refetch };
}
