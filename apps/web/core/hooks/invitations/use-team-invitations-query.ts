'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { queryKeys } from '@/core/query/keys';
import { getAccessTokenCookie, getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { TeamInvitationsQueryParams } from '@/core/types/interfaces/user/invite';
import { useIsMemberManager } from '../organizations/teams/use-team-member';
import { useUserQuery } from '../queries/user-user.query';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { useFastScopeGuard } from '../bootstrap/use-fast-scope-guard';

export interface UseTeamInvitationsQueryOptions {
	enabled?: boolean;
}

/**
 * Hook for reading team invitations (Admin/Manager).
 * READ only — no mutations. Following Single Responsibility Principle.
 *
 * Use `useSendTeamInvitation` for send operations (invite, resend).
 * Use `useRemoveTeamInvitation` for removing invitations.
 *
 * @returns Object containing team invitations data, loading states, and firstLoad callback
 */
export function useTeamInvitationsQuery({ enabled = true }: UseTeamInvitationsQueryOptions = {}) {
	const activeTeamId = getActiveTeamIdCookie();
	const { firstLoadData: firstLoadTeamInvitationsData } = useFirstLoad();

	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);
	const fastBootstrap = FAST_APP_BOOTSTRAP.value;
	const scope = {
		tenantId: user?.tenantId,
		organizationId: user?.employee?.organizationId,
		teamId: activeTeamId,
		userId: user?.id,
		accessToken: fastBootstrap ? getAccessTokenCookie() : undefined
	};
	const queryKey = fastBootstrap
		? queryKeys.users.invitations.teamByScope(scope.tenantId, scope.organizationId, scope.teamId)
		: queryKeys.users.invitations.team(scope.tenantId || '', scope.organizationId || '', scope.teamId || '');
	const fastOwnerActive = enabled && fastBootstrap;
	const fastQueryEnabled =
		fastOwnerActive &&
		isTeamManager &&
		!!(scope.tenantId && scope.organizationId && scope.teamId && scope.userId && scope.accessToken);
	useFastScopeGuard(queryKey, fastOwnerActive);

	// Request params
	const teamInvitationsParams: TeamInvitationsQueryParams | null =
		activeTeamId && user?.tenantId && user?.employee?.organizationId
			? {
					tenantId: user.tenantId,
					organizationId: user.employee.organizationId,
					teamId: activeTeamId
				}
			: null;

	// ===== QUERY =====

	const {
		data: teamInvitationsData,
		isLoading: teamInvitationsLoading,
		isSuccess: teamInvitationsSuccess
	} = useQuery({
		queryKey,
		queryFn: async ({ signal }) => {
			if (!teamInvitationsParams) return { items: [] };
			return fastBootstrap
				? await inviteService.getTeamInvitations({ teamId: teamInvitationsParams.teamId }, { scope, signal })
				: await inviteService.getTeamInvitations({ teamId: teamInvitationsParams.teamId });
		},
		enabled: fastBootstrap ? fastQueryEnabled : enabled && !!(activeTeamId && isTeamManager && user?.tenantId)
	});

	// ===== HYDRATED DATA =====

	const teamInvitations = useMemo(
		() => (teamInvitationsSuccess ? (teamInvitationsData?.items ?? []) : []),
		[teamInvitationsData?.items, teamInvitationsSuccess]
	);

	// ===== RETURN =====

	return {
		teamInvitations,
		firstLoadTeamInvitationsData,
		fetchingInvitations: teamInvitationsLoading,
		isLoading: teamInvitationsLoading,
		isSuccess: teamInvitationsSuccess
	};
}
