'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskRelatedIssueTypeService } from '@/core/services/client/api/tasks/task-related-issue-type.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskRelatedIssueTypes } from './use-invalidate-task-related-issue-types';

/**
 * Hook for reading task related issue types data.
 *
 * @returns Object containing:
 * - `taskRelatedIssueTypes` — memoized array (stable reference)
 * - `loading` — loading state
 * - `loadTaskRelatedIssueTypeData` / `firstLoadTaskRelatedIssueTypeData` — legacy backward compat
 */
export function useTaskRelatedIssueTypesQuery() {
	const { teamId, isEnabled } = useInvalidateTaskRelatedIssueTypes();
	const { firstLoadData: firstLoadTaskRelatedIssueTypeDataRaw } = useFirstLoad();

	const taskRelatedIssueTypesQuery = useQuery({
		queryKey: queryKeys.taskRelatedIssueTypes.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskRelatedIssueTypeService.getTaskRelatedIssueTypeList();
			return res.data;
		},
		enabled: isEnabled
	});

	const taskRelatedIssueTypes = useMemo(
		() => taskRelatedIssueTypesQuery.data?.items ?? [],
		[taskRelatedIssueTypesQuery.data?.items]
	);

	const loadTaskRelatedIssueTypeData = useCallback(async () => {
		return taskRelatedIssueTypesQuery.data;
	}, [taskRelatedIssueTypesQuery.data]);

	const firstLoadTaskRelatedIssueTypeData = useCallback(async () => {
		await loadTaskRelatedIssueTypeData();
		firstLoadTaskRelatedIssueTypeDataRaw();
	}, [firstLoadTaskRelatedIssueTypeDataRaw, loadTaskRelatedIssueTypeData]);

	return {
		taskRelatedIssueTypes,
		loading: taskRelatedIssueTypesQuery.isLoading,
		loadTaskRelatedIssueTypeData,
		firstLoadTaskRelatedIssueTypeData
	};
}

