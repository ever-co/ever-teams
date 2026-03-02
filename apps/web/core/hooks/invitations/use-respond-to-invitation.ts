'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { useAuthenticateUser } from '../auth';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { useRouter } from 'next/navigation';
import { useInvitationInvalidation } from './use-invitation-invalidation';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '../queries/user-user.query';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TInvite } from '@/core/types/schemas';

/**
 * Hook for responding to invitations (accept or reject).
 * WRITE only — single mutation operation. Following Single Responsibility Principle.
 *
 * Side effects are centralized here:
 * - On accept: refreshToken + router.refresh (session update)
 * - On reject: optimistic React Query cache update + cross-cache invalidation
 *
 * @returns Object containing respond mutation function and its loading state
 */
export function useRespondToInvitation() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { refreshToken } = useAuthenticateUser();
	const { invalidateTeamInvitations, invalidateMyInvitations } = useInvitationInvalidation();
	const { data: user } = useUserQuery();

	// ===== ACCEPT / REJECT =====

	const acceptOrRejectMutation = useMutation({
		mutationFn: async ({ id, action }: { id: string; action: EInviteAction }) => {
			return await inviteService.acceptRejectMyInvitations(id, action);
		},
		onSuccess: async (res, { id, action }) => {
			if (res.message) {
				return res.message;
			}

			if (action === EInviteAction.ACCEPTED) {
				await refreshToken();
				router.refresh();
				return res;
			}

			// Optimistic update for rejection — update React Query cache directly
			queryClient.setQueryData<PaginationResponse<TInvite>>(
				queryKeys.users.invitations.my(user?.tenantId || ''),
				(old) => {
					if (!old?.items) return old;
					const filtered = old.items.filter((invitation) => invitation.id !== id);
					return { ...old, items: filtered, total: filtered.length };
				}
			);

			// Cross-invalidate both caches
			invalidateTeamInvitations();
			invalidateMyInvitations();

			return res;
		}
	});

	const acceptOrRejectInvitation = useCallback(
		(id: string, action: EInviteAction) => {
			return acceptOrRejectMutation.mutateAsync({ id, action });
		},
		[acceptOrRejectMutation]
	);

	// ===== RETURN =====

	return {
		acceptOrRejectInvitation,
		acceptOrRejectLoading: acceptOrRejectMutation.isPending
	};
}

