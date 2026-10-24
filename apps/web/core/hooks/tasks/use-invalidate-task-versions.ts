'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/index';
import { activeTeamIdState, activeTeamState } from '@/core/stores';
import { useUserQuery } from '../queries/user-user.query';
import { createTaskMetadataScope, invalidateTaskMetadataSectionCaches } from './task-metadata-cache';

/**
 * Hook providing shared cache invalidation logic for task versions.
 */
export function useInvalidateTaskVersions() {
	const queryClient = useQueryClient();
	const activeTeamId = getActiveTeamIdCookie();
	const activeTeamStateId = useAtomValue(activeTeamIdState);
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const teamId = activeTeam?.id || activeTeamId || activeTeamStateId;
	const organizationId = user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = user?.employee?.tenantId || getTenantIdCookie();
	const projectId = getActiveProjectIdCookie();
	const scope = useMemo(
		() => createTaskMetadataScope(tenantId, organizationId, teamId, projectId),
		[organizationId, projectId, teamId, tenantId]
	);

	const invalidateTaskVersionsData = useCallback(
		() =>
			invalidateTaskMetadataSectionCaches(queryClient, {
				section: 'taskVersions',
				scope,
				teamId: activeTeamId
			}),
		[activeTeamId, queryClient, scope]
	);

	return { invalidateTaskVersionsData, queryClient, activeTeamId, teamId, organizationId, tenantId };
}
