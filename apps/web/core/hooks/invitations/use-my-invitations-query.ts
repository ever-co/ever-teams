'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TInvite } from '@/core/types/schemas';
import { useScopeGuard } from '../bootstrap/use-scope-guard';
import { useReactiveAccessTokenCookie } from '../auth/use-reactive-access-token-cookie';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';

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
	const accessToken = useReactiveAccessTokenCookie();
	const scope = {
		tenantId: user?.tenantId,
		userId: user?.id,
		accessToken
	};
	const myInvitationsKey = useMemo(
		() => queryKeys.users.invitations.myByUser(scope.tenantId, scope.userId),
		[scope.tenantId, scope.userId]
	);
	const queryEnabled = !!(scope.tenantId && scope.userId && scope.accessToken);
	const isCurrentScope = useScopeGuard(myInvitationsKey, true);

	// ===== QUERY =====

	const {
		data: myInvitationsData,
		isLoading: myInvitationsLoading,
		isSuccess: myInvitationsSuccess,
		refetch: refetchMyInvitationsQuery
	} = useQuery({
		queryKey: myInvitationsKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => inviteService.getMyInvitations({ scope, signal }),
		enabled: queryEnabled,
		staleTime: 2 * 60 * 1000, // 2 minutes — prevents unnecessary refetch on re-mount
		gcTime: 5 * 60 * 1000, // 5 minutes — keeps data in cache after unmount
		// Keep invitation changes fresh without adding the read to the critical startup path.
		refetchInterval: 60_000
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
		if (!queryEnabled || !isCurrentScope()) return;
		void refetchMyInvitationsQuery();
	}, [isCurrentScope, queryEnabled, refetchMyInvitationsQuery]);

	// ===== RETURN =====

	return {
		myInvitations,
		myInvitationsLoading,
		refetchMyInvitations,
		removeMyInvitation
	};
}
