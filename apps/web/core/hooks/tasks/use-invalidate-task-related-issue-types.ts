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
 * Hook providing shared cache invalidation logic for task related issue types.
 * Also exposes resolved `tenantId`, `organizationId`, `teamId` and `isEnabled` guard.
 */
export function useInvalidateTaskRelatedIssueTypes() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const activeTeam = useAtomValue(activeTeamState);
	const { data: authUser } = useUserQuery();
	const queryClient = useQueryClient();

	const organizationId = useMemo(() => authUser?.employee?.organizationId || getOrganizationIdCookie(), [authUser]);
	const tenantId = useMemo(() => authUser?.employee?.tenantId || getTenantIdCookie(), [authUser]);
	const teamId = useMemo(() => activeTeam?.id || getActiveTeamIdCookie() || activeTeamId, [activeTeam, activeTeamId]);

	const isEnabled = !!tenantId && !!organizationId && !!teamId;
	const projectId = getActiveProjectIdCookie();
	const scope = useMemo(
		() => createTaskMetadataScope(tenantId, organizationId, teamId, projectId),
		[organizationId, projectId, teamId, tenantId]
	);

	const invalidateTaskRelatedIssueTypesData = useCallback(
		() => invalidateTaskMetadataSectionCaches(queryClient, { section: 'relatedIssueTypes', scope, teamId }),
		[queryClient, scope, teamId]
	);

	return {
		invalidateTaskRelatedIssueTypesData,
		queryClient,
		tenantId,
		organizationId,
		teamId,
		isEnabled
	};
}
