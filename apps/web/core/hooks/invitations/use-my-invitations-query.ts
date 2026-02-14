'use client';

import { myInvitationsState } from '@/core/stores';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TInvite } from '@/core/types/schemas';

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
	const setMyInvitations = useSetAtom(myInvitationsState);
	const myInvitationsAtom = useAtomValue(myInvitationsState);

	const { data: user } = useUserQuery();

	// ===== QUERY =====

	const {
		data: myInvitationsData,
		isLoading: myInvitationsLoading,
		isSuccess: myInvitationsSuccess,
		refetch: refetchMyInvitationsQuery
	} = useQuery({
		queryKey: queryKeys.users.invitations.my(user?.tenantId || ''),
		queryFn: async () => {
			return await inviteService.getMyInvitations();
		},
		enabled: !!user?.tenantId,
		staleTime: 2 * 60 * 1000, // 2 minutes — prevents unnecessary refetch on re-mount
		gcTime: 5 * 60 * 1000 // 5 minutes — keeps data in cache after unmount
	});

	// ===== JOTAI SYNCHRONIZATION =====

	useEffect(() => {
		if (myInvitationsSuccess && myInvitationsData?.items) {
			setMyInvitations(myInvitationsData.items);
		}
	}, [myInvitationsSuccess, myInvitationsData?.items, setMyInvitations]);

	// ===== HYDRATED DATA =====

	const myInvitations = useMemo(() => {
		return myInvitationsSuccess && myInvitationsData?.items
			? (myInvitationsData?.items ?? myInvitationsAtom)
			: [];
	}, [myInvitationsData?.items, myInvitationsSuccess, myInvitationsAtom]);

	// ===== LOCAL STATE OPERATIONS =====

	const removeMyInvitation = useCallback(
		(id: string) => {
			// Update Jotai atom (backward compat for legacy consumers)
			setMyInvitations((prev) => prev.filter((invitation) => invitation.id !== id));

			// Update React Query cache so hydrated `myInvitations` reflects the removal immediately
			queryClient.setQueryData<PaginationResponse<TInvite>>(
				queryKeys.users.invitations.my(user?.tenantId || ''),
				(old) => {
					if (!old) return old;
					return {
						...old,
						items: old.items.filter((invitation) => invitation.id !== id),
						total: old.total - 1
					};
				}
			);
		},
		[setMyInvitations, queryClient, user?.tenantId]
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

