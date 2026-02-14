'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { InviteUserParams } from '@/core/types/interfaces/user/invite';
import { useUserQuery } from '../queries/user-user.query';
import { useInvitationInvalidation } from './use-invitation-invalidation';

/**
 * Hook for sending team invitations (invite new user + resend existing invitation).
 * WRITE only — send operations grouped by semantic cohesion.
 *
 * @returns Object containing invite/resend mutation functions and their loading states
 */
export function useSendTeamInvitation() {
	const { invalidateTeamInvitations } = useInvitationInvalidation();
	const activeTeamId = getActiveTeamIdCookie();
	const { data: user } = useUserQuery();

	// ===== INVITE USER =====

	const inviteUserMutation = useMutation({
		mutationFn: async (params: InviteUserParams) => {
			return await inviteService.inviteByEmails({
				email: params.email,
				name: params.name,
				organizationId: params.organizationId,
				teamId: params.teamId,
				roleId: params.roleId
			});
		},
		onSuccess: () => {
			invalidateTeamInvitations();
		}
	});

	const inviteUser = useCallback(
		(email: string, name: string, roleId?: string) => {
			if (!user?.employee?.organizationId || !activeTeamId || !user?.tenantId) {
				return Promise.reject(new Error('Missing required parameters'));
			}

			return inviteUserMutation.mutateAsync({
				email,
				name,
				organizationId: user.employee.organizationId,
				teamId: activeTeamId,
				tenantId: user.tenantId,
				roleId
			});
		},
		[inviteUserMutation, user, activeTeamId]
	);

	// ===== RESEND INVITATION =====

	const resendInvitationMutation = useMutation({
		mutationFn: async (invitationId: string) => {
			return await inviteService.resendTeamInvitations(invitationId);
		},
		onSuccess: () => {
			invalidateTeamInvitations();
		}
	});

	const resendTeamInvitation = useCallback(
		(invitationId: string) => {
			return resendInvitationMutation.mutateAsync(invitationId);
		},
		[resendInvitationMutation]
	);

	// ===== RETURN =====

	return {
		inviteUser,
		inviteLoading: inviteUserMutation.isPending,
		resendTeamInvitation,
		resendInviteLoading: resendInvitationMutation.isPending
	};
}

