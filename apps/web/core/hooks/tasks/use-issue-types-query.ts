'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { issueTypeService } from '@/core/services/client/api/tasks/issue-type.service';
import { queryKeys } from '@/core/query/keys';
import { useFirstLoad } from '../common/use-first-load';
import { useInvalidateIssueTypes } from './use-invalidate-issue-types';

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

	const issueTypesQuery = useQuery({
		queryKey: queryKeys.issueTypes.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await issueTypeService.getIssueTypeList();
			return res.data;
		},
		enabled: isEnabled,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 15
	});

	// Memoized to prevent infinite re-renders (stable reference)
	const issueTypes = useMemo(() => issueTypesQuery.data?.items ?? [], [issueTypesQuery.data?.items]);

	// Legacy backward compat
	const loadIssueTypes = useCallback(async () => {
		return issueTypesQuery.data;
	}, [issueTypesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadIssueTypes();
		firstLoadIssueTypeData();
	}, [firstLoadIssueTypeData, loadIssueTypes]);

	return {
		issueTypes,
		loading: issueTypesQuery.isLoading,
		getIssueTypesLoading: issueTypesQuery.isLoading,
		loadIssueTypes,
		firstLoadIssueTypeData: handleFirstLoad
	};
}

