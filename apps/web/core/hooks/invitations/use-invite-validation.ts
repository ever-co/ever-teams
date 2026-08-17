'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { IInviteVerifyCode } from '@/core/types/interfaces/user/invite';
import { TAcceptInvitationRequest, TValidateInviteRequest } from '@/core/types/schemas/user/invite.schema';
import { useInvitationInvalidation } from './use-invitation-invalidation';

/**
 * Hook for invitation validation operations (Public/Auth pages).
 * All operations use `useMutation` since they are imperative (triggered by user action).
 *
 * @returns Object containing validation and accept mutation functions with their loading states
 */
export function useInviteValidation() {
	const { invalidateMyInvitations } = useInvitationInvalidation();

	// ===== VALIDATE BY TOKEN =====

	const validateByTokenMutation = useMutation({
		mutationFn: async (params: TValidateInviteRequest) => {
			return await inviteService.validateInviteByTokenAndEmail(params);
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object: that object is recreated on
	// every state change (idle → pending → success), which made these callbacks new on every render.
	// The accept-invite page effect depended on them → validate → new identity → effect → validate …
	// = React #185 (max update depth) and POST /invite/validate-by-code fired ~50×/6s. Every invitee
	// saw "Something went wrong" (2026-08-17).
	const validateByTokenMutateAsync = validateByTokenMutation.mutateAsync;
	const validateInviteByTokenAndEmail = useCallback(
		(params: TValidateInviteRequest) => {
			return validateByTokenMutateAsync(params);
		},
		[validateByTokenMutateAsync]
	);

	// ===== VALIDATE BY CODE =====

	const validateByCodeMutation = useMutation({
		mutationFn: async (params: IInviteVerifyCode) => {
			return await inviteService.validateInvitationByCodeAndEmail(params);
		}
	});

	const validateByCodeMutateAsync = validateByCodeMutation.mutateAsync;
	const validateInviteByCode = useCallback(
		(params: IInviteVerifyCode) => {
			return validateByCodeMutateAsync(params);
		},
		[validateByCodeMutateAsync]
	);

	// ===== ACCEPT INVITATION =====

	const acceptInvitationMutation = useMutation({
		mutationFn: async (data: TAcceptInvitationRequest) => {
			return await inviteService.acceptInvite(data);
		},
		onSuccess: () => {
			invalidateMyInvitations();
		}
	});

	// ===== RETURN =====

	return {
		validateInviteByTokenAndEmail,
		validateInviteByTokenAndEmailLoading: validateByTokenMutation.isPending,
		validateInviteByCode,
		validateInviteByCodeLoading: validateByCodeMutation.isPending,
		acceptInvitationMutation,
		acceptInvitationLoading: acceptInvitationMutation.isPending
	};
}

