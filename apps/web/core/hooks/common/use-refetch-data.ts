import { useCallback } from 'react';
import { useTaskPrioritiesQuery } from '../tasks/use-task-priorities-query';
import { useTaskRelatedIssueType } from '../tasks/use-task-related-issue-type';
import { useTaskSizesQuery } from '../tasks/use-task-sizes-query';
import { useTaskStatusesQuery } from '../tasks/use-task-statuses-query';
import { useTaskVersion } from '../tasks/use-task-version';

export function useRefetchData() {
	const { loadTaskStatuses } = useTaskStatusesQuery();
	const { loadTaskVersionData } = useTaskVersion();
	const { loadTaskPriorities } = useTaskPrioritiesQuery();
	const { loadTaskSizes } = useTaskSizesQuery();
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
