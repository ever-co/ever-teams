'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TInvite } from '@/core/types/schemas';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { useFastScopeGuard } from '../bootstrap/use-fast-scope-guard';

/**
 * Hook for reading the current user's invitations.
 * READ only — no mutations. Following Single Responsibility Principle.
 *
 * Use `useRespondToInvitation` for accept/reject operations.
 *
 * @returns Object containing user invitations data, loading states, and refetch callback
 */
export function useMyInvitationsQuery() {
	const queryClient = useQueryClient();

	const { data: user } = useUserQuery();
	const fastBootstrap = FAST_APP_BOOTSTRAP.value;
	const scope = {
		tenantId: user?.tenantId,
		userId: user?.id,
		accessToken: fastBootstrap ? getAccessTokenCookie() : undefined
	};
	const myInvitationsKey = useMemo(
		() =>
			fastBootstrap
				? queryKeys.users.invitations.myByUser(scope.tenantId, scope.userId)
				: queryKeys.users.invitations.my(user?.tenantId || ''),
		[fastBootstrap, scope.tenantId, scope.userId, user?.tenantId]
	);
	const fastQueryEnabled = fastBootstrap && !!(scope.tenantId && scope.userId && scope.accessToken);
	useFastScopeGuard(myInvitationsKey, fastBootstrap);

	// ===== QUERY =====

	const {
		data: myInvitationsData,
		isLoading: myInvitationsLoading,
		isSuccess: myInvitationsSuccess,
		refetch: refetchMyInvitationsQuery
	} = useQuery({
		queryKey: myInvitationsKey,
		queryFn: async ({ signal }) => {
			return fastBootstrap
				? await inviteService.getMyInvitations({ scope, signal })
				: await inviteService.getMyInvitations();
		},
		enabled: fastBootstrap ? fastQueryEnabled : !!user?.tenantId,
		staleTime: 2 * 60 * 1000, // 2 minutes — prevents unnecessary refetch on re-mount
		gcTime: 5 * 60 * 1000 // 5 minutes — keeps data in cache after unmount
	});

	// ===== HYDRATED DATA =====

	const myInvitations = useMemo(
		() => (myInvitationsSuccess ? (myInvitationsData?.items ?? []) : []),
		[myInvitationsData?.items, myInvitationsSuccess]
	);

	// ===== LOCAL STATE OPERATIONS =====

	const removeMyInvitation = useCallback(
		(id: string) => {
			// Optimistic update: remove from React Query cache immediately
			queryClient.setQueryData<PaginationResponse<TInvite>>(myInvitationsKey, (old) => {
				if (!old?.items) return old;
				const filtered = old.items.filter((invitation) => invitation.id !== id);
				return {
					...old,
					items: filtered,
					total: old.total - (old.items.length - filtered.length)
				};
			});
		},
		[myInvitationsKey, queryClient]
	);

	// ===== REFETCH CALLBACK =====

	const refetchMyInvitations = useCallback(() => {
		refetchMyInvitationsQuery();
	}, [refetchMyInvitationsQuery]);

	// ===== RETURN =====

	return {
		myInvitations,
		myInvitationsLoading,
		refetchMyInvitations,
		removeMyInvitation
	};
}
