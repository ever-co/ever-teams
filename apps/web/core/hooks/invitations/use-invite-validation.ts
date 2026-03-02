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

	const validateInviteByTokenAndEmail = useCallback(
		(params: TValidateInviteRequest) => {
			return validateByTokenMutation.mutateAsync(params);
		},
		[validateByTokenMutation]
	);

	// ===== VALIDATE BY CODE =====

	const validateByCodeMutation = useMutation({
		mutationFn: async (params: IInviteVerifyCode) => {
			return await inviteService.validateInvitationByCodeAndEmail(params);
		}
	});

	const validateInviteByCode = useCallback(
		(params: IInviteVerifyCode) => {
			return validateByCodeMutation.mutateAsync(params);
		},
		[validateByCodeMutation]
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

