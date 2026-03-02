'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeTeamState, activeTeamIdState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Hook providing shared cache invalidation logic for task labels.
 *
 * Centralizes the invalidation of task label-related queries
 * to avoid duplication across multiple mutation hooks (create, edit, delete).
 *
 * @returns Object containing:
 * - `invalidateTaskLabelsData` - Function to invalidate all task label caches
 * - `queryClient` - The React Query client instance
 * - `teamId` - The resolved active team ID
 * - `organizationId` - The resolved organization ID
 * - `tenantId` - The resolved tenant ID
 * - `isEnabled` - Whether all required params are available
 */
export function useInvalidateTaskLabels() {
	const queryClient = useQueryClient();
	const activeTeamId = useAtomValue(activeTeamIdState);
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();

	const teamId = useMemo(() => activeTeam?.id || getActiveTeamIdCookie() || activeTeamId, [activeTeam, activeTeamId]);
	const organizationId = useMemo(() => user?.employee?.organizationId || getOrganizationIdCookie(), [user]);
	const tenantId = useMemo(() => user?.employee?.tenantId || getTenantIdCookie(), [user]);
	const isEnabled = useMemo(() => !!tenantId && !!organizationId && !!teamId, [tenantId, organizationId, teamId]);

	const invalidateTaskLabelsData = useCallback(
		() =>
			teamId
				? queryClient.invalidateQueries({
						queryKey: queryKeys.taskLabels.byTeam(teamId)
					})
				: Promise.resolve(),
		[queryClient, teamId]
	);

	return {
		invalidateTaskLabelsData,
		queryClient,
		teamId,
		organizationId,
		tenantId,
		isEnabled
	};
}

