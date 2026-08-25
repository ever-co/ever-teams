'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TInvite } from '@/core/types/schemas';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { useFastScopeGuard } from '../bootstrap/use-fast-scope-guard';
import { useReactiveAccessTokenCookie } from '../auth/use-reactive-access-token-cookie';
import { FAST_CREDENTIAL_QUERY_META } from '@/core/query/fast-credential-query';

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
	const accessToken = useReactiveAccessTokenCookie();
	const scope = {
		tenantId: user?.tenantId,
		userId: user?.id,
		accessToken: fastBootstrap ? accessToken : undefined
	};
	const myInvitationsKey = useMemo(
		() =>
			fastBootstrap
				? queryKeys.users.invitations.myByUser(scope.tenantId, scope.userId)
				: queryKeys.users.invitations.my(user?.tenantId || ''),
		[fastBootstrap, scope.tenantId, scope.userId, user?.tenantId]
	);
	const fastQueryEnabled = fastBootstrap && !!(scope.tenantId && scope.userId && scope.accessToken);
	const isCurrentScope = useFastScopeGuard(myInvitationsKey, fastBootstrap);

	// ===== QUERY =====

	const {
		data: myInvitationsData,
		isLoading: myInvitationsLoading,
		isSuccess: myInvitationsSuccess,
		refetch: refetchMyInvitationsQuery
	} = useQuery({
		queryKey: myInvitationsKey,
		meta: fastBootstrap ? FAST_CREDENTIAL_QUERY_META : undefined,
		queryFn: async ({ signal }) => {
			return fastBootstrap
				? await inviteService.getMyInvitations({ scope, signal })
				: await inviteService.getMyInvitations();
		},
		enabled: fastBootstrap ? fastQueryEnabled : !!user?.tenantId,
		staleTime: 2 * 60 * 1000, // 2 minutes — prevents unnecessary refetch on re-mount
		gcTime: 5 * 60 * 1000, // 5 minutes — keeps data in cache after unmount
		// LegacyInitState already owns this cadence when the fast bootstrap is off.
		refetchInterval: fastBootstrap ? 60_000 : false
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
		if (fastBootstrap && (!fastQueryEnabled || !isCurrentScope())) return;
		void refetchMyInvitationsQuery();
	}, [fastBootstrap, fastQueryEnabled, isCurrentScope, refetchMyInvitationsQuery]);

	// ===== RETURN =====

	return {
		myInvitations,
		myInvitationsLoading,
		refetchMyInvitations,
		removeMyInvitation
	};
}
