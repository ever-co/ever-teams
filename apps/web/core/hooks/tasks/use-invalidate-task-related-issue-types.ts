'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeTeamState, activeTeamIdState } from '@/core/stores';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';

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

	const invalidateTaskRelatedIssueTypesData = useCallback(
		() =>
			teamId
				? queryClient.invalidateQueries({ queryKey: queryKeys.taskRelatedIssueTypes.byTeam(teamId) })
				: Promise.resolve(),
		[queryClient, teamId]
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

