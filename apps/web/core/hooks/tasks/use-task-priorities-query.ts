'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskPriorityService } from '@/core/services/client/api/tasks/task-priority.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskPriorities } from './use-invalidate-task-priorities';
import { TTaskPriority } from '@/core/types/schemas';

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

	const taskPrioritiesQuery = useQuery({
		queryKey: queryKeys.taskPriorities.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			return await taskPriorityService.getTaskPrioritiesList();
		},
		enabled: isEnabled
	});

	// Memoized to prevent infinite re-renders (stable reference)
	const taskPriorities = useMemo(
		() => taskPrioritiesQuery.data?.items ?? [],
		[taskPrioritiesQuery.data?.items]
	);

	/**
	 * Optimistic cache updater — supports functional updater pattern:
	 * setTaskPriorities((prev) => prev.filter(...))
	 */
	const setTaskPriorities = useCallback(
		(updaterOrValue: TTaskPriority[] | ((prev: TTaskPriority[]) => TTaskPriority[])) => {
			queryClient.setQueryData(queryKeys.taskPriorities.byTeam(teamId), (oldData: any) => {
				const prev: TTaskPriority[] = oldData?.items ?? [];
				const newItems = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
				return { ...(oldData ?? {}), items: newItems };
			});
		},
		[queryClient, teamId]
	);

	// Legacy backward compat
	const loadTaskPriorities = useCallback(async () => {
		return taskPrioritiesQuery.data;
	}, [taskPrioritiesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskPriorities();
		firstLoadTaskPrioritiesData();
	}, [firstLoadTaskPrioritiesData, loadTaskPriorities]);

	return {
		taskPriorities,
		loading: taskPrioritiesQuery.isLoading,
		getTaskPrioritiesLoading: taskPrioritiesQuery.isLoading,
		setTaskPriorities,
		loadTaskPriorities,
		firstLoadTaskPrioritiesData: handleFirstLoad
	};
}

