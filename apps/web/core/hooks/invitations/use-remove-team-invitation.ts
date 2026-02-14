'use client';

import { teamInvitationsState } from '@/core/stores';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { toast } from 'sonner';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { useIsMemberManager } from '../organizations/teams/use-team-member';
import { useUserQuery } from '../queries/user-user.query';
import { useInvitationInvalidation } from './use-invitation-invalidation';

/**
 * Hook for removing team invitations (Admin/Manager).
 * WRITE only — single destructive operation. Following Single Responsibility Principle.
 *
 * @returns Object containing remove mutation function and its loading state
 */
export function useRemoveTeamInvitation() {
	const setTeamInvitations = useSetAtom(teamInvitationsState);
	const { invalidateTeamInvitations } = useInvitationInvalidation();

	const activeTeamId = getActiveTeamIdCookie();
	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);

	// ===== REMOVE INVITATION =====

	const removeInvitationMutation = useMutation({
		mutationFn: async ({ invitationId }: { invitationId: string; email?: string }) => {
			if (!activeTeamId) throw new Error('Missing team ID');
			return await inviteService.removeTeamInvitations({
				invitationId,
				teamId: activeTeamId
			});
		},
		onSuccess: (result, { email }) => {
			if (email) {
				toast.success('Invitation removed', {
					description: `Invitation removed for ${email}`,
					duration: 5000
				});
			}
			setTeamInvitations(result.items || []);
			invalidateTeamInvitations();
		}
	});

	const removeTeamInvitation = useCallback(
		(invitationId: string, email?: string) => {
			if (!(activeTeamId && isTeamManager && user?.tenantId)) {
				return Promise.resolve();
			}
			return removeInvitationMutation.mutateAsync({ invitationId, email });
		},
		[removeInvitationMutation, activeTeamId, isTeamManager, user]
	);

	// ===== RETURN =====

	return {
		removeTeamInvitation,
		removeInviteLoading: removeInvitationMutation.isPending
	};
}

