'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { inviteService } from '../../services/client/api/organizations/teams/invites';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
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
	const { invalidateTeamInvitations } = useInvitationInvalidation();

	const activeTeamId = getActiveTeamIdCookie();
	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);
	const t = useTranslations();

	// ===== REMOVE INVITATION =====

	const removeInvitationMutation = useMutation({
		mutationFn: async ({ invitationId }: { invitationId: string; email?: string }) => {
			if (!activeTeamId) throw new Error('Missing team ID');
			return await inviteService.removeTeamInvitations({
				invitationId,
				teamId: activeTeamId
			});
		},
		onError: (error) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.invites.REMOVE_FAILED'), { description: t(reasonKey) });
		},
		onSettled: () => {
			// Invalidate cache — React Query will refetch the latest data
			invalidateTeamInvitations();
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const removeInvitationMutateAsync = removeInvitationMutation.mutateAsync;
	const removeTeamInvitation = useCallback(
		(invitationId: string, email?: string) => {
			if (!(activeTeamId && isTeamManager && user?.tenantId)) {
				return Promise.resolve();
			}
			return removeInvitationMutateAsync({ invitationId, email });
		},
		[removeInvitationMutateAsync, activeTeamId, isTeamManager, user]
	);

	// ===== RETURN =====

	return {
		removeTeamInvitation,
		removeInviteLoading: removeInvitationMutation.isPending
	};
}
