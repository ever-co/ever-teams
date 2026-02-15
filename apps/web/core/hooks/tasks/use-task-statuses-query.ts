'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { queryKeys } from '@/core/query/keys';
import { TTaskStatus } from '@/core/types/schemas';
import { useInvalidateTaskStatuses } from './use-invalidate-task-statuses';

/**
 * Hook for read-only task statuses operations.
 * Provides task statuses data fetching, loading states, and cache manipulation.
 * React Query is the single source of truth — no Jotai synchronization.
 *
 * @returns {Object} An object containing:
 * - `taskStatuses` - Array of task statuses (from React Query cache)
 * - `loading` - Loading state for task statuses query
 * - `getTaskStatusesLoading` - Alias for loading state (backward compat)
 * - `setTaskStatuses` - Function to optimistically update task statuses in cache
 * - `loadTaskStatuses` - Legacy load function (backward compat)
 * - `firstLoadTaskStatusesData` - First load handler (backward compat)
 */
export function useTaskStatusesQuery() {
	const { queryClient, teamId, organizationId, tenantId } = useInvalidateTaskStatuses();
	const { firstLoadData: firstLoadTaskStatusesData } = useFirstLoad();

	// Main query: fetch all task statuses for the active team
	const taskStatusesQuery = useQuery({
		queryKey: queryKeys.taskStatuses.byTeam(teamId),
		queryFn: () => {
			if (!organizationId || !teamId || !tenantId) {
				throw new Error('Required parameters missing: organizationId, teamId, and tenantId are required');
			}
			return taskStatusService.getTaskStatuses();
		},
		enabled: Boolean(organizationId) && Boolean(teamId) && Boolean(tenantId)
	});

	const taskStatuses = useMemo(() => taskStatusesQuery.data?.items ?? [], [taskStatusesQuery.data?.items]);

	// Wrapper around queryClient.setQueryData to keep the same API as the old Jotai setter
	// Used by consumers for optimistic updates: setTaskStatuses((prev) => prev.map/filter(...))
	const setTaskStatuses = useCallback(
		(updaterOrValue: TTaskStatus[] | ((prev: TTaskStatus[]) => TTaskStatus[])) => {
			queryClient.setQueryData(queryKeys.taskStatuses.byTeam(teamId), (old: any) => {
				const prevItems: TTaskStatus[] = old?.items ?? [];
				const newItems = typeof updaterOrValue === 'function' ? updaterOrValue(prevItems) : updaterOrValue;
				return old ? { ...old, items: newItems } : { items: newItems };
			});
		},
		[queryClient, teamId]
	);

	// Legacy load function for backward compatibility
	const loadTaskStatuses = useCallback(async () => {
		try {
			const res = taskStatusesQuery.data;
			return res;
		} catch (error) {
			console.error('Failed to load task statuses:', error);
		}
	}, [taskStatusesQuery.data]);

	// Legacy first load handler for backward compatibility
	const handleFirstLoad = useCallback(() => {
		loadTaskStatuses();
		firstLoadTaskStatusesData();
	}, [firstLoadTaskStatusesData, loadTaskStatuses]);

	return {
		taskStatuses,
		loading: taskStatusesQuery.isLoading,
		getTaskStatusesLoading: taskStatusesQuery.isLoading,
		setTaskStatuses,
		loadTaskStatuses,
		firstLoadTaskStatusesData: handleFirstLoad
	};
}

