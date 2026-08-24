'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskRelatedIssueTypeService } from '@/core/services/client/api/tasks/task-related-issue-type.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateTaskRelatedIssueTypes } from './use-invalidate-task-related-issue-types';
import { useTaskMetadataBootstrapQuery } from './use-task-metadata-bootstrap-query';

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
	const taskMetadataQuery = useTaskMetadataBootstrapQuery();

	const taskRelatedIssueTypesQuery = useQuery({
		queryKey: queryKeys.taskRelatedIssueTypes.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskRelatedIssueTypeService.getTaskRelatedIssueTypeList();
			return res.data;
		},
		enabled: !taskMetadataQuery.useBootstrap && isEnabled
	});

	const taskRelatedIssueTypesData = taskMetadataQuery.useBootstrap
		? taskMetadataQuery.data?.relatedIssueTypes
		: taskRelatedIssueTypesQuery.data;
	const taskRelatedIssueTypes = useMemo(
		() => taskRelatedIssueTypesData?.items ?? [],
		[taskRelatedIssueTypesData?.items]
	);
	const taskRelatedIssueTypesLoading = taskMetadataQuery.useBootstrap
		? taskMetadataQuery.isLoading
		: taskRelatedIssueTypesQuery.isLoading;

	const loadTaskRelatedIssueTypeData = useCallback(async () => {
		return taskRelatedIssueTypesData;
	}, [taskRelatedIssueTypesData]);

	const firstLoadTaskRelatedIssueTypeData = useCallback(async () => {
		await loadTaskRelatedIssueTypeData();
		firstLoadTaskRelatedIssueTypeDataRaw();
	}, [firstLoadTaskRelatedIssueTypeDataRaw, loadTaskRelatedIssueTypeData]);

	return {
		taskRelatedIssueTypes,
		loading: taskRelatedIssueTypesLoading,
		loadTaskRelatedIssueTypeData,
		firstLoadTaskRelatedIssueTypeData
	};
}
