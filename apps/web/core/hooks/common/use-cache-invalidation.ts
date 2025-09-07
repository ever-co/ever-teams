'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/core/query/keys';

/**
 * Utility function to invalidate multiple queries elegantly
 */
const invalidateMultipleQueries = async (queryClient: any, queryKeysList: any[]) => {
	await Promise.all(queryKeysList.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};

/**
 * Pre-defined query groups for different invalidation scenarios
 * This makes the code more maintainable and readable
 */
const QUERY_GROUPS = {
	TEAM_RELATED: [
		queryKeys.organizationTeams.all,
		queryKeys.tasks.all,
		queryKeys.dailyPlans.all,
		queryKeys.users.invitations.all
	],
	TASK_METADATA: [
		queryKeys.taskStatuses.all,
		queryKeys.taskPriorities.all,
		queryKeys.taskSizes.all,
		queryKeys.taskLabels.all,
		queryKeys.taskVersions.all,
		queryKeys.projects.all,
		queryKeys.issueTypes.all
	]
} as const;

/**
 * Custom hook for centralized cache invalidation
 * Provides semantic methods for different invalidation scenarios
 */
export function useCacheInvalidation() {
	const queryClient = useQueryClient();

	/**
	 * Invalidate all team-related data after team creation/update/deletion
	 */
	const invalidateTeamRelatedData = useCallback(async (): Promise<void> => {
		await invalidateMultipleQueries(queryClient, [...QUERY_GROUPS.TEAM_RELATED]);
	}, [queryClient]);

	/**
	 * Invalidate all task-related metadata after team creation
	 * (exact match with manual invalidations)
	 */
	const invalidateTaskMetadata = useCallback(async (): Promise<void> => {
		await invalidateMultipleQueries(queryClient, [...QUERY_GROUPS.TASK_METADATA]);
	}, [queryClient]);

	/**
	 * Complete invalidation for team creation - ultra elegant one-liner
	 */
	const invalidateAfterTeamCreation = useCallback(async (): Promise<void> => {
		await invalidateMultipleQueries(queryClient, [...QUERY_GROUPS.TEAM_RELATED, ...QUERY_GROUPS.TASK_METADATA]);
	}, [queryClient]);

	/**
	 * Selective invalidation for team updates - avoid circular dependency
	 */
	const invalidateAfterTeamUpdate = useCallback(async (): Promise<void> => {
		await invalidateMultipleQueries(queryClient, [...QUERY_GROUPS.TEAM_RELATED]);
	}, [queryClient]);

	/**
	 * Invalidate user-related data after team membership changes
	 */
	const invalidateUserRelatedData = useCallback(async (): Promise<void> => {
		await queryClient.invalidateQueries({
			predicate: (query) => {
				const key = query.queryKey[0] as string;
				return ['users', 'organizationTeams'].includes(key);
			}
		});
	}, [queryClient]);

	/**
	 * Smart invalidation - automatically determines what to invalidate based on context
	 * Optimized to avoid circular dependencies
	 */
	const smartInvalidate = useCallback(
		async (context: 'team-creation' | 'team-update' | 'user-change'): Promise<void> => {
			switch (context) {
				case 'team-creation':
					await invalidateMultipleQueries(queryClient, [
						...QUERY_GROUPS.TEAM_RELATED,
						...QUERY_GROUPS.TASK_METADATA
					]);
					break;
				case 'team-update':
					await invalidateMultipleQueries(queryClient, [...QUERY_GROUPS.TEAM_RELATED]);
					break;
				case 'user-change':
					await queryClient.invalidateQueries({
						predicate: (query) => {
							const key = query.queryKey[0] as string;
							return ['users', 'organizationTeams'].includes(key);
						}
					});
					break;
			}
		},
		[queryClient]
	);

	return {
		invalidateTeamRelatedData,
		invalidateTaskMetadata,
		invalidateAfterTeamCreation,
		invalidateAfterTeamUpdate,
		invalidateUserRelatedData,
		smartInvalidate
	};
}
