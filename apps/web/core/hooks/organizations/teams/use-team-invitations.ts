'use client';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 *
 * READ:
 * - `useTeamInvitationsQuery` for team invitations data (admin/manager)
 * - `useMyInvitationsQuery` for user's own invitations data (+ removeMyInvitation local state)
 *
 * WRITE:
 * - `useSendTeamInvitation` for invite + resend operations (admin/manager)
 * - `useRemoveTeamInvitation` for removing invitations (admin/manager)
 * - `useRespondToInvitation` for accept/reject operations (user)
 * - `useInviteValidation` for token/code validation and accept (public/auth)
 */

import { useTeamInvitationsQuery } from '../../invitations/use-team-invitations-query';
import { useSendTeamInvitation } from '../../invitations/use-send-team-invitation';
import { useRemoveTeamInvitation } from '../../invitations/use-remove-team-invitation';
import { useMyInvitationsQuery } from '../../invitations/use-my-invitations-query';
import { useRespondToInvitation } from '../../invitations/use-respond-to-invitation';
import { useInviteValidation } from '../../invitations/use-invite-validation';

/**
 * @deprecated Use specialized hooks instead (see file header).
 */
export function useTeamInvitations() {
	// ==================== SPECIALIZED HOOKS ====================

	const { teamInvitations, firstLoadTeamInvitationsData, fetchingInvitations } = useTeamInvitationsQuery();

	const { inviteUser, inviteLoading, resendTeamInvitation, resendInviteLoading } = useSendTeamInvitation();

	const { removeTeamInvitation, removeInviteLoading } = useRemoveTeamInvitation();

	const { myInvitations: myInvitationsList, refetchMyInvitations, myInvitationsLoading, removeMyInvitation } =
		useMyInvitationsQuery();

	const { acceptOrRejectInvitation, acceptOrRejectLoading } = useRespondToInvitation();

	const {
		validateInviteByTokenAndEmail,
		validateInviteByTokenAndEmailLoading,
		validateInviteByCode,
		validateInviteByCodeLoading,
		acceptInvitationMutation,
		acceptInvitationLoading
	} = useInviteValidation();

	// ==================== RETURN ALL PROPERTIES (BACKWARD COMPATIBILITY) ====================

	return {
		// From useTeamInvitationsQuery (READ Admin)
		teamInvitations,
		firstLoadTeamInvitationsData,
		fetchingInvitations,

		// From useSendTeamInvitation (WRITE Admin — send)
		inviteUser,
		inviteLoading,
		resendTeamInvitation,
		resendInviteLoading,

		// From useRemoveTeamInvitation (WRITE Admin — delete)
		removeTeamInvitation,
		removeInviteLoading,

		// From useMyInvitationsQuery (READ User + local state)
		myInvitationsList,
		myInvitations: refetchMyInvitations,
		myInvitationsQueryCall: refetchMyInvitations,
		myInvitationsLoading,
		removeMyInvitation,

		// From useRespondToInvitation (WRITE User)
		acceptRejectMyInvitation: acceptOrRejectInvitation,
		acceptRejectMyInvitationsLoading: acceptOrRejectLoading,

		// From useInviteValidation (Public/Auth)
		validateInviteByTokenAndEmail,
		validateInviteByTokenAndEmailLoading,
		validateInviteByCode,
		validateInviteByCodeLoading,
		acceptInvitationMutation,
		acceptInvitationLoading
	};
}
