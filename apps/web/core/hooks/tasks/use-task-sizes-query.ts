'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskSizes } from './use-invalidate-task-sizes';
import { TTaskSize } from '@/core/types/schemas';

/**
 * Hook for reading task sizes data.
 *
 * Provides:
 * - `taskSizes` — memoized array of task sizes (stable reference)
 * - `loading` / `getTaskSizesLoading` — loading state
 * - `setTaskSizes` — optimistic cache updater via queryClient.setQueryData
 * - `loadTaskSizes` / `firstLoadTaskSizesData` — legacy backward compat
 */
export function useTaskSizesQuery() {
	const { queryClient, teamId } = useInvalidateTaskSizes();
	const { firstLoadData: firstLoadTaskSizesData } = useFirstLoad();

	const taskSizesQuery = useQuery({
		queryKey: queryKeys.taskSizes.byTeam(teamId),
		queryFn: async () => {
			const res = await taskSizeService.getTaskSizes();
			return res;
		}
	});

	// Memoized to prevent infinite re-renders (stable reference)
	const taskSizes = useMemo(() => taskSizesQuery.data?.items ?? [], [taskSizesQuery.data?.items]);

	/**
	 * Optimistic cache updater — supports functional updater pattern:
	 * setTaskSizes((prev) => prev.filter(...))
	 */
	const setTaskSizes = useCallback(
		(updaterOrValue: TTaskSize[] | ((prev: TTaskSize[]) => TTaskSize[])) => {
			queryClient.setQueryData(queryKeys.taskSizes.byTeam(teamId), (oldData: any) => {
				const prev: TTaskSize[] = oldData?.items ?? [];
				const newItems = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
				return { ...(oldData ?? {}), items: newItems };
			});
		},
		[queryClient, teamId]
	);

	// Legacy backward compat
	const loadTaskSizes = useCallback(async () => {
		return taskSizesQuery.data;
	}, [taskSizesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskSizes();
		firstLoadTaskSizesData();
	}, [firstLoadTaskSizesData, loadTaskSizes]);

	return {
		taskSizes,
		loading: taskSizesQuery.isLoading,
		getTaskSizesLoading: taskSizesQuery.isLoading,
		setTaskSizes,
		loadTaskSizes,
		firstLoadTaskSizesData: handleFirstLoad
	};
}

