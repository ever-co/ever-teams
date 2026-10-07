'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeTeamState, activeTeamIdState } from '@/core/stores';
import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/index';
import { useUserQuery } from '../queries/user-user.query';
import { createTaskMetadataScope, invalidateTaskMetadataSectionCaches } from './task-metadata-cache';

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
	const projectId = getActiveProjectIdCookie();
	const scope = useMemo(
		() => createTaskMetadataScope(tenantId, organizationId, teamId, projectId),
		[organizationId, projectId, teamId, tenantId]
	);

	const invalidateTaskStatusesData = useCallback(
		() => invalidateTaskMetadataSectionCaches(queryClient, { section: 'taskStatuses', scope, teamId }),
		[queryClient, scope, teamId]
	);

	return {
		invalidateTaskStatusesData,
		queryClient,
		teamId,
		organizationId,
		tenantId
	};
}
