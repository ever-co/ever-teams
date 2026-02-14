'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
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

	const invalidateTeamInvitations = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.users.invitations.team(
				user?.tenantId || '',
				user?.employee?.organizationId || '',
				activeTeamId || ''
			)
		});
	}, [queryClient, user?.tenantId, user?.employee?.organizationId, activeTeamId]);

	const invalidateMyInvitations = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.users.invitations.all
		});
	}, [queryClient]);

	return { invalidateTeamInvitations, invalidateMyInvitations };
}

