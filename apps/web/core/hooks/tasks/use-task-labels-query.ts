'use client';

import { useCallback, useMemo, useOptimistic, startTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskLabels } from './use-invalidate-task-labels';
import { OptimisticAction, TTag } from '@/core/types/schemas';

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

	const taskLabelsQuery = useQuery({
		queryKey: queryKeys.taskLabels.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskLabelService.getTaskLabelsList();
			return res.data;
		},
		enabled: isEnabled
	});

	// Memoized to prevent infinite re-renders (stable reference)
	const actualTaskLabels = useMemo(() => taskLabelsQuery.data?.items ?? [], [taskLabelsQuery.data?.items]);

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
			queryClient.setQueryData(queryKeys.taskLabels.byTeam(teamId), (oldData: any) => {
				const prev: TTag[] = oldData?.items ?? [];
				const newItems = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
				return { ...(oldData ?? {}), items: newItems };
			});
		},
		[queryClient, teamId]
	);

	// Legacy backward compat
	const loadTaskLabels = useCallback(async () => {
		return taskLabelsQuery.data;
	}, [taskLabelsQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskLabels();
		firstLoadTaskLabelsData();
	}, [firstLoadTaskLabelsData, loadTaskLabels]);

	return {
		taskLabels: optimisticLabels, // Return optimistic labels for UI
		actualTaskLabels, // Provide access to actual data if needed
		loading: taskLabelsQuery.isLoading,
		getTaskLabelsLoading: taskLabelsQuery.isLoading,
		setTaskLabels,
		loadTaskLabels,
		firstLoadTaskLabelsData: handleFirstLoad,

		// Optimistic UI helpers (for consumers that need to compose optimistic mutations)
		addOptimisticLabel,
		baseLabels,
		startTransition
	};
}

