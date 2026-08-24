'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { queryKeys } from '@/core/query/keys';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { useUserQuery } from '../queries/user-user.query';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';

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
	const fastBootstrap = FAST_APP_BOOTSTRAP.value;
	const teamQueryKey = useMemo(
		() =>
			fastBootstrap
				? queryKeys.users.invitations.teamByScope(user?.tenantId, user?.employee?.organizationId, activeTeamId)
				: queryKeys.users.invitations.team(
						user?.tenantId || '',
						user?.employee?.organizationId || '',
						activeTeamId || ''
					),
		[activeTeamId, fastBootstrap, user?.employee?.organizationId, user?.tenantId]
	);
	const myQueryKey = useMemo(
		() =>
			fastBootstrap
				? queryKeys.users.invitations.myByUser(user?.tenantId, user?.id)
				: queryKeys.users.invitations.all,
		[fastBootstrap, user?.id, user?.tenantId]
	);

	const invalidateTeamInvitations = useCallback(
		() => queryClient.invalidateQueries({ queryKey: teamQueryKey, exact: fastBootstrap }),
		[fastBootstrap, queryClient, teamQueryKey]
	);

	const invalidateMyInvitations = useCallback(
		() => queryClient.invalidateQueries({ queryKey: myQueryKey, exact: fastBootstrap }),
		[fastBootstrap, myQueryKey, queryClient]
	);

	return { invalidateTeamInvitations, invalidateMyInvitations };
}
