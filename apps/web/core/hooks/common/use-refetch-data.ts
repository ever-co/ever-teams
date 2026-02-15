import { useCallback } from 'react';
import { useTaskPrioritiesQuery } from '../tasks/use-task-priorities-query';
import { useTaskRelatedIssueTypesQuery } from '../tasks/use-task-related-issue-types-query';
import { useTaskSizesQuery } from '../tasks/use-task-sizes-query';
import { useTaskStatusesQuery } from '../tasks/use-task-statuses-query';
import { useTaskVersionsQuery } from '../tasks/use-task-versions-query';

export function useRefetchData() {
	const { loadTaskStatuses } = useTaskStatusesQuery();
	const { loadTaskVersionData } = useTaskVersionsQuery();
	const { loadTaskPriorities } = useTaskPrioritiesQuery();
	const { loadTaskSizes } = useTaskSizesQuery();
	const { loadTaskRelatedIssueTypeData } = useTaskRelatedIssueTypesQuery();

	const refetch = useCallback(() => {
		loadTaskStatuses();
		loadTaskVersionData();
		loadTaskPriorities();
		loadTaskSizes();
		loadTaskRelatedIssueTypeData();
	}, [loadTaskStatuses, loadTaskVersionData, loadTaskPriorities, loadTaskSizes, loadTaskRelatedIssueTypeData]);

	return { refetch };
}
