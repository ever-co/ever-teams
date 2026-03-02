'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeTeamState, activeTeamIdState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Hook providing shared cache invalidation logic for task statuses.
 *
 * Centralizes the invalidation of task status-related queries
 * to avoid duplication across multiple mutation hooks (create, edit, delete, reorder).
 *
 * @returns Object containing:
 * - `invalidateTaskStatusesData` - Function to invalidate all task status caches
 * - `queryClient` - The React Query client instance
 * - `teamId` - The resolved active team ID
 * - `organizationId` - The resolved organization ID
 * - `tenantId` - The resolved tenant ID
 */
export function useInvalidateTaskStatuses() {
	const queryClient = useQueryClient();
	const activeTeamId = useAtomValue(activeTeamIdState);
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();

	const teamId = activeTeam?.id || getActiveTeamIdCookie() || activeTeamId;
	const organizationId = user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = user?.employee?.tenantId || getTenantIdCookie();

	const invalidateTaskStatusesData = useCallback(
		() =>
			teamId
				? queryClient.invalidateQueries({
						queryKey: queryKeys.taskStatuses.byTeam(teamId)
					})
				: Promise.resolve(),
		[queryClient, teamId]
	);

	return {
		invalidateTaskStatusesData,
		queryClient,
		teamId,
		organizationId,
		tenantId
	};
}

