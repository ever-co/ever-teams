'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { queryKeys } from '@/core/query/keys';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Shared cache invalidation logic for invitation mutations.
 * Ensures consistent cache invalidation across all invitation operations.
 *
 * Following the same pattern as `useDailyPlanInvalidation`.
 *
 * @returns Object containing invalidation functions for team and user invitations
 */
export function useInvitationInvalidation() {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const activeTeamId = getActiveTeamIdCookie();
	const teamQueryKey = useMemo(
		() => queryKeys.users.invitations.teamByScope(user?.tenantId, user?.employee?.organizationId, activeTeamId),
		[activeTeamId, user?.employee?.organizationId, user?.tenantId]
	);
	const myQueryKey = useMemo(
		() => queryKeys.users.invitations.myByUser(user?.tenantId, user?.id),
		[user?.id, user?.tenantId]
	);

	const invalidateTeamInvitations = useCallback(
		() => queryClient.invalidateQueries({ queryKey: teamQueryKey, exact: true }),
		[queryClient, teamQueryKey]
	);

	const invalidateMyInvitations = useCallback(
		() => queryClient.invalidateQueries({ queryKey: myQueryKey, exact: true }),
		[myQueryKey, queryClient]
	);

	return { invalidateTeamInvitations, invalidateMyInvitations };
}
