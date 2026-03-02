'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeTeamState, activeTeamIdState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Hook providing shared cache invalidation logic for issue types.
 *
 * Centralizes the invalidation of issue type-related queries
 * to avoid duplication across multiple mutation hooks (create, edit, delete).
 *
 * @returns Object containing:
 * - `invalidateIssueTypesData` - Function to invalidate all issue type caches
 * - `queryClient` - The React Query client instance
 * - `teamId` - The resolved active team ID
 * - `organizationId` - The resolved organization ID
 * - `tenantId` - The resolved tenant ID
 * - `isEnabled` - Whether all required params are available
 */
export function useInvalidateIssueTypes() {
	const queryClient = useQueryClient();
	const activeTeamId = useAtomValue(activeTeamIdState);
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();

	const teamId = useMemo(() => activeTeam?.id || activeTeamId, [activeTeam?.id, activeTeamId]);
	const organizationId = useMemo(() => user?.employee?.organizationId, [user?.employee?.organizationId]);
	const tenantId = useMemo(() => user?.employee?.tenantId, [user?.employee?.tenantId]);
	const isEnabled = useMemo(() => !!tenantId && !!organizationId && !!teamId, [tenantId, organizationId, teamId]);

	const invalidateIssueTypesData = useCallback(
		() =>
			teamId
				? queryClient.invalidateQueries({
						queryKey: queryKeys.issueTypes.byTeam(teamId)
					})
				: Promise.resolve(),
		[queryClient, teamId]
	);

	return {
		invalidateIssueTypesData,
		queryClient,
		teamId,
		organizationId,
		tenantId,
		isEnabled
	};
}

