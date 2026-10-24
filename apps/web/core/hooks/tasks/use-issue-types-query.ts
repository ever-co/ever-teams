'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { issueTypeService } from '@/core/services/client/api/tasks/issue-type.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateIssueTypes } from './use-invalidate-issue-types';
import { useTaskMetadataBootstrapQuery } from './use-task-metadata-bootstrap-query';

/**
 * Hook for reading issue types data.
 *
 * Provides:
 * - `issueTypes` — memoized array of issue types (stable reference)
 * - `loading` / `getIssueTypesLoading` — loading state
 * - `loadIssueTypes` / `firstLoadIssueTypeData` — legacy backward compat
 */
export function useIssueTypesQuery() {
	const { teamId, isEnabled } = useInvalidateIssueTypes();
	const { firstLoadData: firstLoadIssueTypeData } = useFirstLoad();
	const taskMetadataQuery = useTaskMetadataBootstrapQuery();

	const issueTypesQuery = useQuery({
		queryKey: queryKeys.issueTypes.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await issueTypeService.getIssueTypeList();
			return res.data;
		},
		enabled: !taskMetadataQuery.useBootstrap && isEnabled,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15
	});

	const issueTypesData = taskMetadataQuery.useBootstrap ? taskMetadataQuery.data?.issueTypes : issueTypesQuery.data;
	// Memoized to prevent infinite re-renders (stable reference)
	const issueTypes = useMemo(() => issueTypesData?.items ?? [], [issueTypesData?.items]);
	const issueTypesLoading = taskMetadataQuery.useBootstrap ? taskMetadataQuery.isLoading : issueTypesQuery.isLoading;

	// Legacy backward compat
	const loadIssueTypes = useCallback(async () => {
		return issueTypesData;
	}, [issueTypesData]);

	const handleFirstLoad = useCallback(async () => {
		await loadIssueTypes();
		firstLoadIssueTypeData();
	}, [firstLoadIssueTypeData, loadIssueTypes]);

	return {
		issueTypes,
		loading: issueTypesLoading,
		getIssueTypesLoading: issueTypesLoading,
		loadIssueTypes,
		firstLoadIssueTypeData: handleFirstLoad
	};
}
