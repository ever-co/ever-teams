'use client';

import { QueryClient, QueryKey, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/core/query/keys';

/**
 * Utility function to invalidate multiple queries elegantly
 */
const invalidateMultipleQueries = async (queryClient: QueryClient, queryKeysList: QueryKey[]) => {
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

	WORKSPACE_RELATED: [
		queryKeys.organizationProjects.all,
		queryKeys.timer.all,
		queryKeys.integrations.all,
		queryKeys.workspaces.all
	],
	TASK_METADATA: [
		queryKeys.taskStatuses.all,
		queryKeys.taskPriorities.all,
		queryKeys.taskSizes.all,
		queryKeys.taskLabels.all,
		queryKeys.taskVersions.all,
		queryKeys.projects.all,
		queryKeys.issueTypes.all
	],
	USER_RELATED: [
		queryKeys.users.all,
		queryKeys.users.invitations.all,
		queryKeys.users.settings.all,
		queryKeys.users.employees.all,
	],
	ALL: [
		queryKeys.users.all,
		queryKeys.organizationTeams.all,
		queryKeys.tasks.all,
		queryKeys.dailyPlans.all,
		queryKeys.organizationProjects.all,
		queryKeys.timer.all,
		queryKeys.integrations.all,
		queryKeys.workspaces.all,
		queryKeys.taskPriorities.all,
		queryKeys.taskSizes.all,
		queryKeys.taskLabels.all,
		queryKeys.taskVersions.all,
		queryKeys.projects.all,
		queryKeys.issueTypes.all,
		queryKeys.roles.all,
		queryKeys.permissions.all,
		queryKeys.organizations.all,
		queryKeys.teams.all,
		queryKeys.timesheet.all,
		queryKeys.tags.all,
		queryKeys.favorites.all,
		queryKeys.activities.all,
		queryKeys.taskStatuses.all,
		queryKeys.taskRelatedIssueTypes.all,
		queryKeys.languages.all,
		queryKeys.timeLogs.all,
		queryKeys.currencies.all
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
		await invalidateMultipleQueries(queryClient, [
			...QUERY_GROUPS.TEAM_RELATED,
			...QUERY_GROUPS.WORKSPACE_RELATED,
			...QUERY_GROUPS.TASK_METADATA
		]);
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
				return ['users', 'organization-teams'].includes(key);
			}
		});
	}, [queryClient]);

	/**
	 * Smart invalidation - automatically determines what to invalidate based on context
	 * Optimized to avoid circular dependencies
	 */
	const smartInvalidate = useCallback(
		async (context: 'all' | 'team-creation' | 'team-update' | 'user-change'): Promise<void> => {
			switch (context) {
				case 'all':
					await invalidateMultipleQueries(queryClient, [...QUERY_GROUPS.ALL]);
					break;
				case 'team-creation':
					await invalidateMultipleQueries(queryClient, [
						...QUERY_GROUPS.TEAM_RELATED,
						...QUERY_GROUPS.WORKSPACE_RELATED,
						...QUERY_GROUPS.TASK_METADATA,
						...QUERY_GROUPS.USER_RELATED
					]);
					break;
				case 'team-update':
					await invalidateMultipleQueries(queryClient, [...QUERY_GROUPS.TEAM_RELATED]);
					break;
				case 'user-change':
					await queryClient.invalidateQueries({
						predicate: (query) => {
							const key = query.queryKey[0] as string;
							return ['users', 'organization-teams'].includes(key);
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
