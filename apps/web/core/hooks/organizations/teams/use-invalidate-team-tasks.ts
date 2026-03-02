'use client';

import { activeTeamState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook providing shared cache invalidation logic for team tasks.
 *
 * This hook centralizes the invalidation of team task-related queries
 * to avoid duplication across multiple hooks (create, update, delete).
 *
 * @returns Object containing:
 * - `invalidateTeamTasksData` - Function to invalidate all team task caches
 */
export function useInvalidateTeamTasks() {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);

	/**
	 * Invalidate all team task-related queries.
	 * @param taskId - Optional task ID to also invalidate the specific task detail query
	 */
	const invalidateTeamTasksData = useCallback(
		(taskId?: string) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.all
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.tasks.byTeam(activeTeam?.id)
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.dailyPlans.all
			});
			// Invalidate task detail if provided
			if (taskId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.tasks.detail(taskId)
				});
			}
		},
		[activeTeam?.id, queryClient]
	);

	return { invalidateTeamTasksData };
}
