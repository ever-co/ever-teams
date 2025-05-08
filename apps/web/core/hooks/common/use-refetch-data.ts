import { useCallback } from 'react';
import { useTaskPriorities } from '../tasks/use-task-priorities';
import { useTaskRelatedIssueType } from '../tasks/use-task-related-issue-type';
import { useTaskSizes } from '../tasks/use-task-sizes';
import { useTaskStatus } from '../tasks/use-task-status';
import { useTaskVersion } from '../tasks/use-task-version';

export function useRefetchData() {
	const { loadTaskStatuses } = useTaskStatus();
	const { loadTaskVersionData } = useTaskVersion();
	const { loadTaskPriorities } = useTaskPriorities();
	const { loadTaskSizes } = useTaskSizes();
	const { loadTaskRelatedIssueTypeData } = useTaskRelatedIssueType();

	const refetch = useCallback(() => {
		loadTaskStatuses();
		loadTaskVersionData();
		loadTaskPriorities();
		loadTaskSizes();
		loadTaskRelatedIssueTypeData();
	}, [loadTaskStatuses, loadTaskVersionData, loadTaskPriorities, loadTaskSizes, loadTaskRelatedIssueTypeData]);

	return { refetch };
}
