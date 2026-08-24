'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskPriorityService } from '@/core/services/client/api/tasks/task-priority.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskPriorities } from './use-invalidate-task-priorities';
import { TTaskPriority } from '@/core/types/schemas';
import { useTaskMetadataBootstrapQuery } from './use-task-metadata-bootstrap-query';
import { updateTaskMetadataSectionCaches } from './task-metadata-cache';

/**
 * Hook for reading task priorities data.
 *
 * Provides:
 * - `taskPriorities` — memoized array of task priorities (stable reference)
 * - `loading` / `getTaskPrioritiesLoading` — loading state
 * - `setTaskPriorities` — optimistic cache updater via queryClient.setQueryData
 * - `loadTaskPriorities` / `firstLoadTaskPrioritiesData` — legacy backward compat
 */
export function useTaskPrioritiesQuery() {
	const { queryClient, teamId, isEnabled } = useInvalidateTaskPriorities();
	const { firstLoadData: firstLoadTaskPrioritiesData } = useFirstLoad();
	const taskMetadataQuery = useTaskMetadataBootstrapQuery();

	const taskPrioritiesQuery = useQuery({
		queryKey: queryKeys.taskPriorities.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			return await taskPriorityService.getTaskPrioritiesList();
		},
		enabled: !taskMetadataQuery.useBootstrap && isEnabled
	});

	const taskPrioritiesData = taskMetadataQuery.useBootstrap
		? taskMetadataQuery.data?.taskPriorities
		: taskPrioritiesQuery.data;
	// Memoized to prevent infinite re-renders (stable reference)
	const taskPriorities = useMemo(() => taskPrioritiesData?.items ?? [], [taskPrioritiesData?.items]);
	const taskPrioritiesLoading = taskMetadataQuery.useBootstrap
		? taskMetadataQuery.isLoading
		: taskPrioritiesQuery.isLoading;

	/**
	 * Optimistic cache updater — supports functional updater pattern:
	 * setTaskPriorities((prev) => prev.filter(...))
	 */
	const setTaskPriorities = useCallback(
		(updaterOrValue: TTaskPriority[] | ((prev: TTaskPriority[]) => TTaskPriority[])) => {
			updateTaskMetadataSectionCaches<TTaskPriority>(
				queryClient,
				{
					section: 'taskPriorities',
					scope: taskMetadataQuery.scope,
					teamId,
					useBootstrap: taskMetadataQuery.useBootstrap
				},
				updaterOrValue
			);
		},
		[queryClient, taskMetadataQuery.scope, taskMetadataQuery.useBootstrap, teamId]
	);

	// Legacy backward compat
	const loadTaskPriorities = useCallback(async () => {
		return taskPrioritiesData;
	}, [taskPrioritiesData]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskPriorities();
		firstLoadTaskPrioritiesData();
	}, [firstLoadTaskPrioritiesData, loadTaskPriorities]);

	return {
		taskPriorities,
		loading: taskPrioritiesLoading,
		getTaskPrioritiesLoading: taskPrioritiesLoading,
		setTaskPriorities,
		loadTaskPriorities,
		firstLoadTaskPrioritiesData: handleFirstLoad
	};
}
