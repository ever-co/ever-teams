'use client';

import { myInvitationsState } from '@/core/stores';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { useAuthenticateUser } from '../auth';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { useRouter } from 'next/navigation';
import { useInvitationInvalidation } from './use-invitation-invalidation';

/**
 * Hook for responding to invitations (accept or reject).
 * WRITE only — single mutation operation. Following Single Responsibility Principle.
 *
 * Side effects are centralized here:
 * - On accept: refreshToken + router.refresh (session update)
 * - On reject: optimistic Jotai update + cross-cache invalidation
 *
 * @returns Object containing respond mutation function and its loading state
 */
export function useRespondToInvitation() {
	const router = useRouter();
	const setMyInvitations = useSetAtom(myInvitationsState);
	const { refreshToken } = useAuthenticateUser();
	const { invalidateTeamInvitations, invalidateMyInvitations } = useInvitationInvalidation();

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

			// Optimistic update for rejection
			setMyInvitations((prev) => prev.filter((invitation) => invitation.id !== id));

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

