'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskVersions } from './use-invalidate-task-versions';
import { useTaskMetadataBootstrapQuery } from './use-task-metadata-bootstrap-query';

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
	const taskMetadataQuery = useTaskMetadataBootstrapQuery();

	const taskVersionsQuery = useQuery({
		queryKey: queryKeys.taskVersions.byTeam(activeTeamId),
		queryFn: async () => taskVersionService.getTaskVersions(),
		enabled: !taskMetadataQuery.useBootstrap
	});

	const taskVersionsData = taskMetadataQuery.useBootstrap
		? taskMetadataQuery.data?.taskVersions
		: taskVersionsQuery.data;
	const taskVersions = useMemo(() => taskVersionsData?.items ?? [], [taskVersionsData?.items]);
	const taskVersionsLoading = taskMetadataQuery.useBootstrap
		? taskMetadataQuery.isLoading
		: taskVersionsQuery.isLoading;
	const taskVersionsPending = taskMetadataQuery.useBootstrap
		? taskMetadataQuery.isPending
		: taskVersionsQuery.isPending;

	const loadTaskVersionData = useCallback(() => {
		return taskVersionsData;
	}, [taskVersionsData]);

	return {
		taskVersions,
		loading: taskVersionsLoading,
		taskVersionFetching: taskVersionsPending,
		loadTaskVersionData,
		firstLoadTaskVersionData
	};
}
