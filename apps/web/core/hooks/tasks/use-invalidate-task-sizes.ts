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
 * Hook providing shared cache invalidation logic for task sizes.
 *
 * Centralizes the invalidation of task size-related queries
 * to avoid duplication across multiple mutation hooks (create, edit, delete).
 *
 * @returns Object containing:
 * - `invalidateTaskSizesData` - Function to invalidate all task size caches
 * - `queryClient` - The React Query client instance
 * - `teamId` - The resolved active team ID
 * - `organizationId` - The resolved organization ID
 * - `tenantId` - The resolved tenant ID
 */
export function useInvalidateTaskSizes() {
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

	const invalidateTaskSizesData = useCallback(
		() => invalidateTaskMetadataSectionCaches(queryClient, { section: 'taskSizes', scope, teamId }),
		[queryClient, scope, teamId]
	);

	return {
		invalidateTaskSizesData,
		queryClient,
		teamId,
		organizationId,
		tenantId
	};
}
