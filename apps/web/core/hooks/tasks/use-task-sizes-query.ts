'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskSizes } from './use-invalidate-task-sizes';
import { TTaskSize } from '@/core/types/schemas';
import { useTaskMetadataBootstrapQuery } from './use-task-metadata-bootstrap-query';
import { updateTaskMetadataSectionCaches } from './task-metadata-cache';

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
	const taskMetadataQuery = useTaskMetadataBootstrapQuery();

	const taskSizesQuery = useQuery({
		queryKey: queryKeys.taskSizes.byTeam(teamId),
		queryFn: async () => {
			const res = await taskSizeService.getTaskSizes();
			return res;
		},
		enabled: !taskMetadataQuery.useBootstrap
	});

	const taskSizesData = taskMetadataQuery.useBootstrap ? taskMetadataQuery.data?.taskSizes : taskSizesQuery.data;
	// Memoized to prevent infinite re-renders (stable reference)
	const taskSizes = useMemo(() => taskSizesData?.items ?? [], [taskSizesData?.items]);
	const taskSizesLoading = taskMetadataQuery.useBootstrap ? taskMetadataQuery.isLoading : taskSizesQuery.isLoading;

	/**
	 * Optimistic cache updater — supports functional updater pattern:
	 * setTaskSizes((prev) => prev.filter(...))
	 */
	const setTaskSizes = useCallback(
		(updaterOrValue: TTaskSize[] | ((prev: TTaskSize[]) => TTaskSize[])) => {
			updateTaskMetadataSectionCaches<TTaskSize>(
				queryClient,
				{
					section: 'taskSizes',
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
	const loadTaskSizes = useCallback(async () => {
		return taskSizesData;
	}, [taskSizesData]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskSizes();
		firstLoadTaskSizesData();
	}, [firstLoadTaskSizesData, loadTaskSizes]);

	return {
		taskSizes,
		loading: taskSizesLoading,
		getTaskSizesLoading: taskSizesLoading,
		setTaskSizes,
		loadTaskSizes,
		firstLoadTaskSizesData: handleFirstLoad
	};
}
