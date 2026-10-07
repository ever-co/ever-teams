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
	const projectId = getActiveProjectIdCookie();
	const scope = useMemo(
		() => createTaskMetadataScope(tenantId, organizationId, teamId, projectId),
		[organizationId, projectId, teamId, tenantId]
	);

	const invalidateTaskLabelsData = useCallback(
		() => invalidateTaskMetadataSectionCaches(queryClient, { section: 'taskLabels', scope, teamId }),
		[queryClient, scope, teamId]
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
