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
				emails: params.emails,
				organizationId: params.organizationId,
				teamId: params.teamId,
				roleId: params.roleId
			});
		},
		// The invite dialog reports a failure next to the addresses, with the reason
		meta: { handlesOwnError: true },
		onSuccess: () => {
			invalidateTeamInvitations();
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const inviteUserMutateAsync = inviteUserMutation.mutateAsync;
	/** Invites every address in one request; Gauzy skips the ones already invited to the team. */
	const inviteUsers = useCallback(
		(emails: string[], roleId?: string) => {
			const organizationId = user?.employee?.organizationId;
			const tenantId = user?.tenantId;
			if (!organizationId || !activeTeamId || !tenantId) {
				return Promise.reject(new Error('Missing required parameters'));
			}

			return inviteUserMutateAsync({ emails, organizationId, teamId: activeTeamId, tenantId, roleId });
		},
		[inviteUserMutateAsync, user, activeTeamId]
	);

	/** @deprecated One address at a time; the name is ignored, Gauzy does not need it. Use `inviteUsers`. */
	const inviteUser = useCallback(
		(email: string, _name?: string, roleId?: string) => inviteUsers([email], roleId),
		[inviteUsers]
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

	const resendInvitationMutateAsync = resendInvitationMutation.mutateAsync;
	const resendTeamInvitation = useCallback(
		(invitationId: string) => {
			return resendInvitationMutateAsync(invitationId);
		},
		[resendInvitationMutateAsync]
	);

	// ===== RETURN =====

	return {
		inviteUsers,
		inviteUser,
		inviteLoading: inviteUserMutation.isPending,
		resendTeamInvitation,
		resendInviteLoading: resendInvitationMutation.isPending
	};
}
