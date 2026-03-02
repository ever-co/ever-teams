'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskVersions } from './use-invalidate-task-versions';

/**
 * Hook for reading task versions data.
 *
 * @returns Object containing:
 * - `taskVersions` — memoized array of task versions (stable reference)
 * - `loading` / `taskVersionFetching` — loading states
 * - `loadTaskVersionData` / `firstLoadTaskVersionData` — legacy backward compat
 */
export function useTaskVersionsQuery() {
	const { activeTeamId } = useInvalidateTaskVersions();
	const { firstLoadData: firstLoadTaskVersionData } = useFirstLoad();

	const taskVersionsQuery = useQuery({
		queryKey: queryKeys.taskVersions.byTeam(activeTeamId),
		queryFn: async () => taskVersionService.getTaskVersions()
	});

	const taskVersions = useMemo(
		() => taskVersionsQuery.data?.items ?? [],
		[taskVersionsQuery.data?.items]
	);

	const loadTaskVersionData = useCallback(() => {
		return taskVersionsQuery.data;
	}, [taskVersionsQuery.data]);

	return {
		taskVersions,
		loading: taskVersionsQuery.isLoading,
		taskVersionFetching: taskVersionsQuery.isPending,
		loadTaskVersionData,
		firstLoadTaskVersionData
	};
}

