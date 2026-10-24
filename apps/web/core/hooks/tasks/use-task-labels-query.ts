'use client';

import { useCallback, useMemo, useOptimistic, startTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskLabels } from './use-invalidate-task-labels';
import { OptimisticAction, TTag } from '@/core/types/schemas';
import { useTaskMetadataBootstrapQuery } from './use-task-metadata-bootstrap-query';
import { updateTaskMetadataSectionCaches } from './task-metadata-cache';

/**
 * Hook for reading task labels data.
 *
 * Provides:
 * - `taskLabels` — optimistic labels for UI (stable reference via useOptimistic)
 * - `actualTaskLabels` — raw memoized array from query cache
 * - `loading` / `getTaskLabelsLoading` — loading state
 * - `addOptimisticLabel` — dispatch function for optimistic UI updates
 * - `baseLabels` — stable base data for optimistic UI
 * - `loadTaskLabels` / `firstLoadTaskLabelsData` — legacy backward compat
 */
export function useTaskLabelsQuery() {
	const { queryClient, teamId, isEnabled } = useInvalidateTaskLabels();
	const { firstLoadData: firstLoadTaskLabelsData } = useFirstLoad();
	const taskMetadataQuery = useTaskMetadataBootstrapQuery();

	const taskLabelsQuery = useQuery({
		queryKey: queryKeys.taskLabels.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskLabelService.getTaskLabelsList();
			return res.data;
		},
		enabled: !taskMetadataQuery.useBootstrap && isEnabled
	});

	const taskLabelsData = taskMetadataQuery.useBootstrap ? taskMetadataQuery.data?.taskLabels : taskLabelsQuery.data;
	// Memoized to prevent infinite re-renders (stable reference)
	const actualTaskLabels = useMemo(() => taskLabelsData?.items ?? [], [taskLabelsData?.items]);
	const taskLabelsLoading = taskMetadataQuery.useBootstrap ? taskMetadataQuery.isLoading : taskLabelsQuery.isLoading;

	// Stable base data for optimistic UI
	const baseLabels = useMemo(() => actualTaskLabels || [], [actualTaskLabels]);

	// Optimistic UI state for task labels with proper typing
	const [optimisticLabels, addOptimisticLabel] = useOptimistic<TTag[], OptimisticAction>(
		baseLabels as TTag[],
		(state, action) => {
			switch (action.type) {
				case 'add':
					return [action.label, ...state];
				case 'update':
					return state.map((label) => (label.id === action.label.id ? action.label : label));
				case 'delete':
					return state.filter((label) => label.id !== action.id);
				default:
					return state;
			}
		}
	);

	/**
	 * Optimistic cache updater — supports functional updater pattern:
	 * setTaskLabels((prev) => prev.filter(...))
	 */
	const setTaskLabels = useCallback(
		(updaterOrValue: TTag[] | ((prev: TTag[]) => TTag[])) => {
			updateTaskMetadataSectionCaches<TTag>(
				queryClient,
				{
					section: 'taskLabels',
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
	const loadTaskLabels = useCallback(async () => {
		return taskLabelsData;
	}, [taskLabelsData]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskLabels();
		firstLoadTaskLabelsData();
	}, [firstLoadTaskLabelsData, loadTaskLabels]);

	return {
		taskLabels: optimisticLabels, // Return optimistic labels for UI
		actualTaskLabels, // Provide access to actual data if needed
		loading: taskLabelsLoading,
		getTaskLabelsLoading: taskLabelsLoading,
		setTaskLabels,
		loadTaskLabels,
		firstLoadTaskLabelsData: handleFirstLoad,

		// Optimistic UI helpers (for consumers that need to compose optimistic mutations)
		addOptimisticLabel,
		baseLabels,
		startTransition
	};
}
