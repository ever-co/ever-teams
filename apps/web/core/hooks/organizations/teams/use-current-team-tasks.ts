import { useMemo } from 'react';
import { useCurrentTeamTasksQuery } from './use-get-team-task.query';

/**
 * Hook that provides access to current team's tasks from the query cache.
 * Returns an empty array as fallback when no data is available.
 *
 * @returns Object containing:
 *  - tasks: Array of tasks for the current team
 *  - total: Total count of tasks
 *  - isLoading: Loading state
 *  - isError: Error state
 */
export const useCurrentTeamTasks = () => {
	const { data: teamTasksResult, isLoading, isError } = useCurrentTeamTasksQuery();

	const tasks = useMemo(() => teamTasksResult?.items ?? [], [teamTasksResult]);
	const total = useMemo(() => teamTasksResult?.total ?? 0, [teamTasksResult]);

	return { tasks, total, isLoading, isError };
};
